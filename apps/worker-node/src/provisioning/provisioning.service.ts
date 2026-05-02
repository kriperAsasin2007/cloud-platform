import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { utils as sshUtils } from 'ssh2';
import { PrismaService } from '../prisma/prisma.service';
import { PortAllocatorService } from './port-allocator.service';

export interface ContainerInfo {
  containerId: string;
  hostPort: number;
  webPort: number;
  cpu: number;
  memory: number;
  userPublicKey?: string;
  proxyPrivateKey?: string;
}

export interface SystemMetrics {
  totalCpu: number;
  freeCpu: number;
  totalMemory: number;
  freeMemory: number;
  runningContainerIds: string[];
}

interface ScheduledMsg {
  instanceId: string;
  cpu: number;
  memory: number;
  imageType: string;
  publicKey: string;
}

// ---------------------------------------------------------------------------
// Image management
// ---------------------------------------------------------------------------

type ImageType = 'ubuntu' | 'alpine';
const IMAGE_TYPES: ImageType[] = ['ubuntu', 'alpine'];

function imageTag(type: string): string {
  return `cloud-platform/${type}:latest`;
}

// In dev (nx serve), @nx/js:node executor runs as process.argv[1] so we can't use it.
// Instead, probe the two known layouts and use whichever exists.
function resolveDockerImagesDir(): string {
  const candidates = [
    // Dev: NX builds into dist/ relative to the workspace root (process.cwd())
    path.join(
      process.cwd(),
      'dist',
      'apps',
      'worker-node',
      'assets',
      'docker-images',
    ),
    // Production: assets sit next to main.js (node dist/main.js)
    path.join(path.dirname(process.argv[1]), 'assets', 'docker-images'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'ubuntu', 'Dockerfile'))) return c;
  }
  return candidates[0]; // let readFileSync produce a clear ENOENT if both miss
}
const DOCKER_IMAGES_DIR = resolveDockerImagesDir();

interface TarEntry {
  name: string;
  content: Buffer;
  mode?: number;
}

function loadBuildContext(type: ImageType): TarEntry[] {
  const dir = path.join(DOCKER_IMAGES_DIR, type);
  return [
    {
      name: 'Dockerfile',
      content: fs.readFileSync(path.join(dir, 'Dockerfile')),
    },
    {
      name: 'entrypoint.sh',
      content: fs.readFileSync(path.join(dir, 'entrypoint.sh')),
      mode: 0o755,
    },
  ];
}

// ---------------------------------------------------------------------------
// Minimal in-memory tar builder — no external dependencies required
// ---------------------------------------------------------------------------

function buildTar(entries: TarEntry[]): Buffer {
  const blocks: Buffer[] = [];

  for (const entry of entries) {
    const mode = ((entry.mode ?? 0o644) & 0o7777).toString(8).padStart(7, '0');

    const header = Buffer.alloc(512, 0);
    header.write(entry.name.slice(0, 99), 0, 'utf8');
    header.write(mode + '\0', 100, 'utf8');
    header.write('0000000\0', 108, 'utf8'); // uid
    header.write('0000000\0', 116, 'utf8'); // gid
    header.write(
      entry.content.length.toString(8).padStart(11, '0') + '\0',
      124,
      'utf8',
    );
    header.write(
      Math.floor(Date.now() / 1000)
        .toString(8)
        .padStart(11, '0') + '\0',
      136,
      'utf8',
    );
    header[156] = 0x30; // '0' = regular file
    header.write('ustar\0', 257, 'utf8');
    header.write('00', 263, 'utf8');

    header.fill(0x20, 148, 156); // spaces while computing checksum
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += header[i];
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 'utf8');

    blocks.push(header);
    const padded = Buffer.alloc(Math.ceil(entry.content.length / 512) * 512, 0);
    entry.content.copy(padded);
    blocks.push(padded);
  }

  blocks.push(Buffer.alloc(1024, 0)); // EOF
  return Buffer.concat(blocks);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ProvisioningService implements OnModuleInit {
  private readonly logger = new Logger(ProvisioningService.name);
  private readonly docker = new Docker();
  // Only SSH key material stays in memory — session-only values, not persisted
  private readonly keyMaterial = new Map<
    string,
    { userPublicKey?: string; proxyPrivateKey?: string }
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly portAllocator: PortAllocatorService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.buildImages();
    await this.rebuildStateFromDocker();
  }

  async provisionContainer(msg: ScheduledMsg): Promise<ContainerInfo> {
    const [hostPort, webPort] = await Promise.all([
      this.portAllocator.allocate(msg.instanceId),
      this.portAllocator.allocate(`${msg.instanceId}:web`),
    ]);
    const tag = imageTag(msg.imageType);
    const { private: proxyPrivateKey, public: proxyPublicKey } =
      sshUtils.generateKeyPairSync('rsa', { bits: 2048 });

    const container = await this.docker.createContainer({
      Image: tag,
      // Proxy's public key is injected so it can authenticate into the container via SSH.
      // The user's public key is stored separately in keyMaterial for the SSH proxy layer.
      Env: [`AUTHORIZED_KEYS=${proxyPublicKey.trim()}`],
      Labels: {
        'cloud-platform': 'true',
        'instance-id': msg.instanceId,
      },
      ExposedPorts: { '22/tcp': {}, '80/tcp': {} },
      HostConfig: {
        PortBindings: {
          '22/tcp': [{ HostPort: String(hostPort) }],
          '80/tcp': [{ HostPort: String(webPort) }],
        },
        NanoCpus: msg.cpu * 1_000_000,
        Memory: msg.memory * 1024 * 1024,
        RestartPolicy: { Name: 'no' },
      },
    });

    await container.start();

    await this.prisma.container.create({
      data: {
        instanceId: msg.instanceId,
        containerId: container.id,
        sshPort: hostPort,
        webPort,
        cpuMillicores: msg.cpu,
        memoryMb: msg.memory,
        status: 'RUNNING',
      },
    });

    this.keyMaterial.set(msg.instanceId, {
      userPublicKey: msg.publicKey,
      proxyPrivateKey,
    });

    this.logger.log(
      `Container ${container.id} started for instance ${msg.instanceId} — SSH :${hostPort} web :${webPort}`,
    );

    return {
      containerId: container.id,
      hostPort,
      webPort,
      cpu: msg.cpu,
      memory: msg.memory,
      userPublicKey: msg.publicKey,
      proxyPrivateKey,
    };
  }

  async terminateContainer(
    instanceId: string,
  ): Promise<{ cpu: number; memory: number }> {
    const row = await this.prisma.container.findUnique({
      where: { instanceId },
    });
    if (!row) {
      throw new Error(`No container tracked for instance ${instanceId}`);
    }

    const container = this.docker.getContainer(row.containerId);
    try {
      await container.stop({ t: 10 });
    } catch (err: unknown) {
      // already stopped
      if ((err as { statusCode?: number }).statusCode !== 304) throw err;
    }
    await container.remove();

    await this.portAllocator.release(row.sshPort);
    if (row.webPort) await this.portAllocator.release(row.webPort);
    await this.prisma.container.update({
      where: { instanceId },
      data: { status: 'REMOVED' },
    });
    this.keyMaterial.delete(instanceId);

    this.logger.log(
      `Container ${row.containerId} removed for instance ${instanceId}`,
    );
    return { cpu: row.cpuMillicores, memory: row.memoryMb };
  }

  async getContainerByInstanceId(
    instanceId: string,
  ): Promise<ContainerInfo | undefined> {
    const row = await this.prisma.container.findUnique({
      where: { instanceId },
    });
    if (!row || row.status === 'REMOVED') return undefined;
    const keys = this.keyMaterial.get(instanceId) ?? {};
    return {
      containerId: row.containerId,
      hostPort: row.sshPort,
      webPort: row.webPort ?? 0,
      cpu: row.cpuMillicores,
      memory: row.memoryMb,
      ...keys,
    };
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const rows = await this.prisma.container.findMany({
      where: { status: 'RUNNING' },
    });

    const totalCpu =
      parseInt(this.config.get('TOTAL_CPU_MILLICORES', '0'), 10) ||
      os.cpus().length * 1000;
    const totalMemory =
      parseInt(this.config.get('TOTAL_MEMORY_MB', '0'), 10) ||
      Math.floor(os.totalmem() / 1024 / 1024);

    const allocatedCpu = rows.reduce((s, r) => s + r.cpuMillicores, 0);
    const allocatedMemory = rows.reduce((s, r) => s + r.memoryMb, 0);

    return {
      totalCpu,
      freeCpu: Math.max(0, totalCpu - allocatedCpu),
      totalMemory,
      freeMemory: Math.max(0, totalMemory - allocatedMemory),
      runningContainerIds: rows.map((r) => r.containerId),
    };
  }

  private async buildImages(): Promise<void> {
    for (const type of IMAGE_TYPES) {
      const tag = imageTag(type);
      try {
        await this.docker.getImage(tag).inspect();
        this.logger.log(`Image ${tag} already exists, skipping build`);
      } catch {
        this.logger.log(`Building image ${tag}…`);
        try {
          await this.buildImageFromContext(tag, loadBuildContext(type));
          this.logger.log(`Image ${tag} built successfully`);
        } catch (err) {
          this.logger.error(
            `Failed to build ${tag} — containers of this type will be unavailable until next restart`,
            err,
          );
        }
      }
    }
  }

  private buildImageFromContext(
    tag: string,
    entries: TarEntry[],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const tarStream = Readable.from([buildTar(entries)]);
      this.docker.buildImage(
        tarStream as unknown as NodeJS.ReadableStream,
        { t: tag },
        (err: Error | null, stream: NodeJS.ReadableStream | undefined) => {
          if (err) return reject(err);
          if (!stream)
            return reject(new Error('buildImage returned no stream'));
          this.docker.modem.followProgress(
            stream,
            (
              followErr: Error | null,
              output: Array<{ stream?: string; error?: string }>,
            ) => {
              if (followErr) return reject(followErr);
              const errLine = output?.find((o) => o.error);
              if (errLine?.error)
                return reject(new Error(errLine.error.trim()));
              resolve();
            },
          );
        },
      );
    });
  }

  private async rebuildStateFromDocker(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({ all: false });
      let recovered = 0;
      for (const c of containers) {
        const instanceId = c.Labels?.['instance-id'];
        if (!instanceId || !c.Labels?.['cloud-platform']) continue;

        const portBinding = c.Ports?.find(
          // support both current (22) and legacy linuxserver (2222) containers
          (p) =>
            (p.PrivatePort === 22 || p.PrivatePort === 2222) && p.PublicPort,
        );
        if (!portBinding?.PublicPort) continue;

        const webPortBinding = c.Ports?.find(
          (p) => p.PrivatePort === 80 && p.PublicPort,
        );

        await this.prisma.container.upsert({
          where: { instanceId },
          create: {
            instanceId,
            containerId: c.Id,
            sshPort: portBinding.PublicPort,
            webPort: webPortBinding?.PublicPort ?? undefined,
            cpuMillicores: 0,
            memoryMb: 0,
            status: 'RUNNING',
          },
          update: {
            containerId: c.Id,
            sshPort: portBinding.PublicPort,
            webPort: webPortBinding?.PublicPort ?? undefined,
            status: 'RUNNING',
          },
        });
        recovered++;
      }
      if (recovered > 0) {
        this.logger.log(
          `Recovered ${recovered} running container(s) from Docker`,
        );
      }
    } catch {
      this.logger.warn(
        'Could not query Docker on startup — starting with empty container state',
      );
    }
  }
}
