import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortAllocatorService implements OnModuleInit {
  private readonly logger = new Logger(PortAllocatorService.name);
  private readonly docker = new Docker();
  private rangeStart!: number;
  private rangeEnd!: number;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.rangeStart = parseInt(String(this.config.get('SSH_PORT_RANGE_START', 10000)), 10);
    this.rangeEnd = parseInt(String(this.config.get('SSH_PORT_RANGE_END', 11000)), 10);

    const usedPorts = await this.reclaimUsedPorts();

    // Reset DB state to match Docker reality after a restart
    await this.prisma.allocatedPort.deleteMany({});
    if (usedPorts.size > 0) {
      await this.prisma.allocatedPort.createMany({
        data: Array.from(usedPorts.entries()).map(([port, instanceId]) => ({
          port,
          instanceId,
        })),
        skipDuplicates: true,
      });
    }

    const available = this.rangeEnd - this.rangeStart + 1 - usedPorts.size;
    this.logger.log(
      `Port pool initialised: ${available} ports available (${this.rangeStart}–${this.rangeEnd})`,
    );
  }

  async allocate(instanceId: string): Promise<number> {
    const allocated = await this.prisma.allocatedPort.findMany({
      select: { port: true },
    });
    const usedSet = new Set(allocated.map((r) => r.port));

    for (let p = this.rangeStart; p <= this.rangeEnd; p++) {
      if (!usedSet.has(p)) {
        await this.prisma.allocatedPort.create({ data: { port: p, instanceId } });
        return p;
      }
    }
    throw new Error('No SSH ports available in pool');
  }

  async release(port: number): Promise<void> {
    await this.prisma.allocatedPort.delete({ where: { port } });
  }

  private async reclaimUsedPorts(): Promise<Map<number, string>> {
    const result = new Map<number, string>();
    try {
      const containers = await this.docker.listContainers({ all: false });
      for (const c of containers) {
        if (!c.Labels?.['cloud-platform']) continue;
        const instanceId = c.Labels?.['instance-id'];
        if (!instanceId) continue;
        for (const p of c.Ports ?? []) {
          if (p.PublicPort) result.set(p.PublicPort, instanceId);
        }
      }
    } catch {
      this.logger.warn(
        'Could not query Docker to reclaim ports — assuming all ports free',
      );
    }
    return result;
  }
}
