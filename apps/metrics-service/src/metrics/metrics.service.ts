import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface WorkerInstanceMetricsMsg {
  nodeId: string;
  recordedAt: string;
  instances: Array<{
    instanceId: string;
    cpuPercent: number;
    memoryMb: number;
    networkInKb: number;
    networkOutKb: number;
  }>;
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertOwnership(
    instanceId: string,
    userId: string,
    active: boolean,
  ): Promise<void> {
    await this.prisma.instanceOwnership.upsert({
      where: { instanceId },
      create: { instanceId, userId, active },
      update: { active },
    });
  }

  async insertMetrics(msg: WorkerInstanceMetricsMsg): Promise<void> {
    const recordedAt = new Date(msg.recordedAt);
    const instanceIds = msg.instances.map((i) => i.instanceId);

    const ownerships = await this.prisma.instanceOwnership.findMany({
      where: { instanceId: { in: instanceIds } },
    });
    const ownerMap = new Map(ownerships.map((o) => [o.instanceId, o.userId]));

    const data = msg.instances
      .filter((i) => ownerMap.has(i.instanceId))
      .map((i) => ({
        instanceId: i.instanceId,
        userId: ownerMap.get(i.instanceId)!,
        cpuPercent: i.cpuPercent,
        memoryMb: i.memoryMb,
        networkInKb: i.networkInKb,
        networkOutKb: i.networkOutKb,
        recordedAt,
      }));

    if (data.length > 0) {
      await this.prisma.instanceMetric.createMany({ data });
    }
  }

  async getInstanceMetrics(
    instanceId: string,
    limit: number,
    since?: Date,
  ) {
    const rows = await this.prisma.instanceMetric.findMany({
      where: {
        instanceId,
        ...(since ? { recordedAt: { gte: since } } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({ ...r, id: r.id.toString() }));
  }

  async getUserMetrics(
    userId: string,
    limit: number,
    since?: Date,
  ) {
    const rows = await this.prisma.instanceMetric.findMany({
      where: {
        userId,
        ...(since ? { recordedAt: { gte: since } } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({ ...r, id: r.id.toString() }));
  }

  async getTotalMetrics() {
    const active = await this.prisma.instanceOwnership.findMany({
      where: { active: true },
    });

    if (active.length === 0) {
      return { totalInstances: 0, totalCpuPercent: 0, totalMemoryMb: 0 };
    }

    const latest = await Promise.all(
      active.map((o) =>
        this.prisma.instanceMetric.findFirst({
          where: { instanceId: o.instanceId },
          orderBy: { recordedAt: 'desc' },
        }),
      ),
    );

    const valid = latest.filter(Boolean);
    return {
      totalInstances: active.length,
      totalCpuPercent: valid.reduce((s, m) => s + Number(m!.cpuPercent), 0),
      totalMemoryMb: valid.reduce((s, m) => s + m!.memoryMb, 0),
    };
  }
}
