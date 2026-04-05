import { Injectable, Logger } from '@nestjs/common';
import { KafkaService } from '@cloud-platform-app/kafka';
import { WorkerNodeRegistry } from './worker-node.registry';

const CHECK_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 60_000;

@Injectable()
export class NodeHealthMonitor {
  private readonly logger = new Logger(NodeHealthMonitor.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly registry: WorkerNodeRegistry,
    private readonly kafka: KafkaService,
  ) {}

  start(): void {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => this.checkStaleNodes(), CHECK_INTERVAL_MS);
    this.logger.log('NodeHealthMonitor started (leader role)');
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      this.logger.log('NodeHealthMonitor stopped');
    }
  }

  private async checkStaleNodes(): Promise<void> {
    const now = Date.now();
    const nodes = this.registry.getAll();

    for (const node of nodes) {
      const age = now - node.lastSeenAt.getTime();
      if (age > STALE_THRESHOLD_MS) {
        await this.registry.markNodeUnhealthy(node.id);
        await this.kafka.publish({
          topic: 'worker.node.unhealthy',
          messages: [{ key: node.id, value: { nodeId: node.id } }],
        });
      }
    }
  }
}
