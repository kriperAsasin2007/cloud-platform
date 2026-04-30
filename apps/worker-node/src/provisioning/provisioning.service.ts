import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import * as os from 'os';
import { utils as sshUtils } from 'ssh2';
import { PrismaService } from '../prisma/prisma.service';
import { PortAllocatorService } from './port-allocator.service';

export interface ContainerInfo {
  containerId: string;
  hostPort: number;
  cpu: number;
  memory: number;
  /** User's public key (OpenSSH format) used by the SSH proxy to authenticate the client. */
  userPublicKey?: string;
  /** Proxy's private key (OpenSSH format) used to authenticate the proxy to this container. */
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

const IMAGE_MAP: Record<string, string> = {
  ubuntu: 'lscr.io/linuxserver/openssh-server:latest',
  alpine: 'lscr.io/linuxserver/openssh-server:latest',
};
const DEFAULT_IMAGE = 'lscr.io/linuxserver/openssh-server:latest';

@Injectable()
export class ProvisioningService implements OnModuleInit {
  private readonly logger = new Logger(ProvisioningService.name);
  private readonly docker = new Docker();
  // Only SSH key material stays in memory — session-only values, not persisted
  private readonly keyMaterial = new Map<string, { userPublicKey?: string; proxyPrivateKey?: string }>();

  constructor(
    private readonly config: ConfigService,
    private readonly portAllocator: PortAllocatorService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rebuildStateFromDocker();
  }

  async provisionContainer(msg: ScheduledMsg): Promise<ContainerInfo> {
    const hostPort = await this.portAllocator.allocate(msg.instanceId);
    const image = IMAGE_MAP[msg.imageType] ?? DEFAULT_IMAGE;
    const { private: proxyPrivateKey, public: proxyPublicKey } =
      sshUtils.generateKeyPairSync('rsa', { bits: 2048 });

    this.logger.log(`Pulling image ${image}…`);
    await this.pullImage(image);

    const container = await this.docker.createContainer({
      Image: image,
      Env: [
        'PUID=1000',
        'PGID=1000',
        'USER_NAME=user',
        `PUBLIC_KEY=${proxyPublicKey}`,
        'SUDO_ACCESS=true',
      ],
      Labels: {
        'cloud-platform': 'true',
        'instance-id': msg.instanceId,
      },
      ExposedPorts: { '2222/tcp': {} },
      HostConfig: {
        PortBindings: { '2222/tcp': [{ HostPort: String(hostPort) }] },
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
      `Container ${container.id} started for instance ${msg.instanceId} on port ${hostPort}`,
    );

    return {
      containerId: container.id,
      hostPort,
      cpu: msg.cpu,
      memory: msg.memory,
      userPublicKey: msg.publicKey,
      proxyPrivateKey,
    };
  }

  async terminateContainer(instanceId: string): Promise<{ cpu: number; memory: number }> {
    const row = await this.prisma.container.findUnique({ where: { instanceId } });
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

  async getContainerByInstanceId(instanceId: string): Promise<ContainerInfo | undefined> {
    const row = await this.prisma.container.findUnique({ where: { instanceId } });
    if (!row || row.status === 'REMOVED') return undefined;
    const keys = this.keyMaterial.get(instanceId) ?? {};
    return {
      containerId: row.containerId,
      hostPort: row.sshPort,
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

  private async pullImage(image: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.docker.pull(
        image,
        (err: Error | null, stream: NodeJS.ReadableStream) => {
          if (err) return reject(err);
          this.docker.modem.followProgress(
            stream,
            (followErr: Error | null) => {
              if (followErr) return reject(followErr);
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
          (p) => p.PrivatePort === 2222 && p.PublicPort,
        );
        if (!portBinding?.PublicPort) continue;

        await this.prisma.container.upsert({
          where: { instanceId },
          create: {
            instanceId,
            containerId: c.Id,
            sshPort: portBinding.PublicPort,
            cpuMillicores: 0,
            memoryMb: 0,
            status: 'RUNNING',
          },
          update: {
            containerId: c.Id,
            sshPort: portBinding.PublicPort,
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
