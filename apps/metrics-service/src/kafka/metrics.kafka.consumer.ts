import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { KafkaService } from '@cloud-platform-app/kafka';
import { MetricsService } from '../metrics/metrics.service';

interface StatusChangedMsg {
  instanceId: string;
  userId: string;
  status: string;
}

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
export class MetricsKafkaConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(MetricsKafkaConsumer.name);

  constructor(
    private readonly kafka: KafkaService,
    private readonly metricsService: MetricsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.createConsumer(
      ['instance.status.changed', 'worker.instance.metrics'],
      this.handleMessage.bind(this),
    );
    this.logger.log('Metrics Kafka consumer subscribed');
  }

  private async handleMessage(topic: string, payload: unknown): Promise<void> {
    switch (topic) {
      case 'instance.status.changed':
        return this.onStatusChanged(payload as StatusChangedMsg);
      case 'worker.instance.metrics':
        return this.onInstanceMetrics(payload as WorkerInstanceMetricsMsg);
    }
  }

  private async onStatusChanged(msg: StatusChangedMsg): Promise<void> {
    if (msg.status === 'RUNNING') {
      await this.metricsService.upsertOwnership(msg.instanceId, msg.userId, true);
    } else if (msg.status === 'TERMINATED' || msg.status === 'FAILED') {
      await this.metricsService.upsertOwnership(msg.instanceId, msg.userId, false);
    }
  }

  private async onInstanceMetrics(msg: WorkerInstanceMetricsMsg): Promise<void> {
    await this.metricsService.insertMetrics(msg);
  }
}
