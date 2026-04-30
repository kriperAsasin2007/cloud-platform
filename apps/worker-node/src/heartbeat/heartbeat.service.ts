import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import Docker from 'dockerode';
import { KafkaService } from '@cloud-platform-app/kafka';
import { PrismaService } from '../prisma/prisma.service';
import { ProvisioningService } from '../provisioning/provisioning.service';

const HEARTBEAT_INTERVAL_MS = 30_000;

interface DockerStats {
  cpu_stats: {
    cpu_usage: { total_usage: number; percpu_usage?: number[] };
    system_cpu_usage: number;
    online_cpus?: number;
  };
  precpu_stats: {
    cpu_usage: { total_usage: number };
    system_cpu_usage: number;
  };
  memory_stats: { usage: number; limit: number };
  networks?: Record<string, { rx_bytes: number; tx_bytes: number }>;
}

@Injectable()
export class HeartbeatService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HeartbeatService.name);
  private readonly nodeId: string;
  private readonly docker = new Docker();

  constructor(
    private readonly config: ConfigService,
    private readonly kafka: KafkaService,
    private readonly provisioning: ProvisioningService,
    private readonly prisma: PrismaService,
  ) {
    this.nodeId = this.config.getOrThrow('WORKER_NODE_ID');
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.sendHeartbeat();
  }

  @Interval(HEARTBEAT_INTERVAL_MS)
  async sendHeartbeat(): Promise<void> {
    const metrics = await this.provisioning.getSystemMetrics();

    const payload = {
      nodeId: this.nodeId,
      freeCpu: metrics.freeCpu,
      totalCpu: metrics.totalCpu,
      freeMemory: metrics.freeMemory,
      totalMemory: metrics.totalMemory,
      runningContainers: metrics.runningContainerIds,
      lastSeenAt: new Date().toISOString(),
    };

    await this.kafka.publish({
      topic: 'worker.heartbeat',
      messages: [{ key: this.nodeId, value: payload }],
    });

    this.logger.debug(
      `Heartbeat sent — cpu: ${metrics.freeCpu}/${metrics.totalCpu} mc, mem: ${metrics.freeMemory}/${metrics.totalMemory} MB`,
    );

    // Collect per-container Docker stats and emit metrics
    const rows = await this.prisma.container.findMany({
      where: { status: 'RUNNING' },
      select: { instanceId: true, containerId: true },
    });

    if (rows.length === 0) return;

    const instanceMetrics = await Promise.all(
      rows.map(async (row) => {
        try {
          const stats = await this.collectContainerStats(row.containerId);
          return { instanceId: row.instanceId, ...stats };
        } catch {
          return {
            instanceId: row.instanceId,
            cpuPercent: 0,
            memoryMb: 0,
            networkInKb: 0,
            networkOutKb: 0,
          };
        }
      }),
    );

    await this.kafka.publish({
      topic: 'worker.instance.metrics',
      messages: [
        {
          key: this.nodeId,
          value: {
            nodeId: this.nodeId,
            recordedAt: new Date().toISOString(),
            instances: instanceMetrics,
            total: {
              totalCpuMillicores: metrics.totalCpu,
              freeCpuMillicores: metrics.freeCpu,
              totalMemoryMb: metrics.totalMemory,
              freeMemoryMb: metrics.freeMemory,
            },
          },
        },
      ],
    });

    this.logger.debug(`Instance metrics emitted for ${instanceMetrics.length} container(s)`);
  }

  private async collectContainerStats(containerId: string): Promise<{
    cpuPercent: number;
    memoryMb: number;
    networkInKb: number;
    networkOutKb: number;
  }> {
    const container = this.docker.getContainer(containerId);
    const stats = (await container.stats({ stream: false })) as DockerStats;

    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const numCpus =
      stats.cpu_stats.online_cpus ??
      stats.cpu_stats.cpu_usage.percpu_usage?.length ??
      1;

    const cpuPercent =
      systemDelta > 0
        ? Math.round(((cpuDelta / systemDelta) * numCpus * 100) * 100) / 100
        : 0;

    const memoryMb = Math.round(stats.memory_stats.usage / 1024 / 1024);

    let netIn = 0;
    let netOut = 0;
    for (const iface of Object.values(stats.networks ?? {})) {
      netIn += iface.rx_bytes;
      netOut += iface.tx_bytes;
    }

    return {
      cpuPercent,
      memoryMb,
      networkInKb: Math.round(netIn / 1024),
      networkOutKb: Math.round(netOut / 1024),
    };
  }
}
