import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { KafkaService } from '@cloud-platform-app/kafka';
import { ProvisioningService } from '../provisioning/provisioning.service';

const HEARTBEAT_INTERVAL_MS = 30_000;

@Injectable()
export class HeartbeatService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HeartbeatService.name);
  private readonly nodeId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly kafka: KafkaService,
    private readonly provisioning: ProvisioningService,
  ) {
    this.nodeId = this.config.getOrThrow('WORKER_NODE_ID');
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.sendHeartbeat();
  }

  @Interval(HEARTBEAT_INTERVAL_MS)
  async sendHeartbeat(): Promise<void> {
    const metrics = this.provisioning.getSystemMetrics();
    const payload = {
      nodeId: this.nodeId,
      freeCpu: metrics.freeCpu,
      totalCpu: metrics.totalCpu,
      freeMemory: metrics.freeMemory,
      totalMemory: metrics.totalMemory,
      runningContainers: metrics.runningContainerIds,
      lastSeenAt: new Date(),
    };

    await this.kafka.publish({
      topic: 'worker.heartbeat',
      messages: [{ key: this.nodeId, value: payload }],
    });

    this.logger.debug(
      `Heartbeat sent — cpu: ${metrics.freeCpu}/${metrics.totalCpu} mc, mem: ${metrics.freeMemory}/${metrics.totalMemory} MB`,
    );
  }
}
