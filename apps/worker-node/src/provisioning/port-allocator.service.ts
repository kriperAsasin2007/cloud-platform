import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';

@Injectable()
export class PortAllocatorService implements OnModuleInit {
  private readonly logger = new Logger(PortAllocatorService.name);
  private readonly available = new Set<number>();
  private readonly docker = new Docker();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const start = this.config.get<number>('SSH_PORT_RANGE_START', 10000);
    const end = this.config.get<number>('SSH_PORT_RANGE_END', 11000);

    for (let p = start; p <= end; p++) {
      this.available.add(p);
    }

    await this.reclaimUsedPorts();
    this.logger.log(`Port pool initialised: ${this.available.size} ports available (${start}–${end})`);
  }

  allocate(): number {
    const port = this.available.values().next().value;
    if (port === undefined) {
      throw new Error('No SSH ports available in pool');
    }
    this.available.delete(port);
    return port;
  }

  release(port: number): void {
    this.available.add(port);
  }

  private async reclaimUsedPorts(): Promise<void> {
    try {
      const containers = await this.docker.listContainers({ all: true });
      for (const c of containers) {
        if (!c.Labels?.['cloud-platform']) continue;
        for (const p of c.Ports ?? []) {
          if (p.PublicPort) this.available.delete(p.PublicPort);
        }
      }
    } catch {
      this.logger.warn('Could not query Docker to reclaim ports — assuming all ports free');
    }
  }
}
