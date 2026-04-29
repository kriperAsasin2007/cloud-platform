import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import * as os from 'os';
import { utils as sshUtils } from 'ssh2';
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
  private readonly containers = new Map<string, ContainerInfo>();

  constructor(
    private readonly config: ConfigService,
    private readonly portAllocator: PortAllocatorService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rebuildStateFromDocker();
  }

  async provisionContainer(msg: ScheduledMsg): Promise<ContainerInfo> {
    const hostPort = this.portAllocator.allocate();
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

    const info: ContainerInfo = {
      containerId: container.id,
      hostPort,
      cpu: msg.cpu,
      memory: msg.memory,
      userPublicKey: msg.publicKey,
      proxyPrivateKey,
    };

    this.containers.set(msg.instanceId, info);
    this.logger.log(
      `Container ${container.id} started for instance ${msg.instanceId} on port ${hostPort}`,
    );
    return info;
  }

  async terminateContainer(
    instanceId: string,
  ): Promise<{ cpu: number; memory: number }> {
    const info = this.containers.get(instanceId);
    if (!info) {
      throw new Error(`No container tracked for instance ${instanceId}`);
    }

    const container = this.docker.getContainer(info.containerId);
    try {
      await container.stop({ t: 10 });
    } catch (err: unknown) {
      // already stopped
      if ((err as { statusCode?: number }).statusCode !== 304) throw err;
    }
    await container.remove();

    this.portAllocator.release(info.hostPort);
    this.containers.delete(instanceId);
    this.logger.log(
      `Container ${info.containerId} removed for instance ${instanceId}`,
    );
    return { cpu: info.cpu, memory: info.memory };
  }

  getContainerByInstanceId(instanceId: string): ContainerInfo | undefined {
    return this.containers.get(instanceId);
  }

  getSystemMetrics(): SystemMetrics {
    const totalCpu =
      parseInt(this.config.get('TOTAL_CPU_MILLICORES', '0'), 10) ||
      os.cpus().length * 1000;
    const totalMemory = Math.floor(os.totalmem() / 1024 / 1024);

    let allocatedCpu = 0;
    let allocatedMemory = 0;
    const runningContainerIds: string[] = [];

    for (const info of this.containers.values()) {
      allocatedCpu += info.cpu;
      allocatedMemory += info.memory;
      runningContainerIds.push(info.containerId);
    }

    return {
      totalCpu,
      freeCpu: Math.max(0, totalCpu - allocatedCpu),
      totalMemory,
      freeMemory: Math.max(0, totalMemory - allocatedMemory),
      runningContainerIds,
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

        this.containers.set(instanceId, {
          containerId: c.Id,
          hostPort: portBinding.PublicPort,
          cpu: 0,
          memory: 0,
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
