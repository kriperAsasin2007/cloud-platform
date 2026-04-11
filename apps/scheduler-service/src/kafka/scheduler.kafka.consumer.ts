import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { KafkaService } from '@cloud-platform-app/kafka';
import { WorkerNodeRegistry, WorkerHeartbeat } from '../scheduler/worker-node.registry';
import { SchedulingAlgorithm } from '../scheduler/scheduling.algorithm';

interface ScheduleRequestedMsg {
  instanceId: string;
  userId: string;
  cpu: number;
  memory: number;
  imageType: string;
}

interface InstanceProvisionedMsg {
  instanceId: string;
  workerNodeId: string;
  cpu: number;
  memory: number;
}

interface InstanceTerminatedMsg {
  instanceId: string;
  workerNodeId: string;
  cpu: number;
  memory: number;
}

@Injectable()
export class SchedulerKafkaConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchedulerKafkaConsumer.name);

  constructor(
    private readonly kafka: KafkaService,
    private readonly registry: WorkerNodeRegistry,
    private readonly algorithm: SchedulingAlgorithm,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.createConsumer(
      [
        'instance.schedule.requested',
        'worker.heartbeat',
        'instance.provisioned',
        'instance.terminated',
      ],
      this.handleMessage.bind(this),
    );
    this.logger.log('Scheduler Kafka consumer subscribed');
  }

  private async handleMessage(topic: string, payload: unknown): Promise<void> {
    switch (topic) {
      case 'instance.schedule.requested':
        return this.onScheduleRequested(payload as ScheduleRequestedMsg);
      case 'worker.heartbeat':
        return this.onWorkerHeartbeat(payload as WorkerHeartbeat);
      case 'instance.provisioned':
        return this.onProvisioned(payload as InstanceProvisionedMsg);
      case 'instance.terminated':
        return this.onTerminated(payload as InstanceTerminatedMsg);
    }
  }

  private async onScheduleRequested(msg: ScheduleRequestedMsg): Promise<void> {
    this.logger.log(`Scheduling instance ${msg.instanceId} (cpu=${msg.cpu}, mem=${msg.memory})`);

    const candidates = this.registry.getEligibleNodes(msg.cpu, msg.memory);

    if (candidates.length === 0) {
      this.logger.warn(`No eligible nodes for instance ${msg.instanceId}`);
      await this.kafka.publish({
        topic: 'instance.provision.failed',
        messages: [{
          key: msg.instanceId,
          value: { instanceId: msg.instanceId, reason: 'NO_CAPACITY' },
        }],
      });
      return;
    }

    const selectedNode = this.algorithm.pickNode(candidates);

    await this.registry.reserveResources(
      selectedNode.id,
      msg.instanceId,
      msg.cpu,
      msg.memory,
    );

    await this.kafka.publish({
      topic: 'instance.scheduled',
      messages: [{
        key: msg.instanceId,
        value: {
          instanceId: msg.instanceId,
          targetNodeId: selectedNode.id,
          cpu: msg.cpu,
          memory: msg.memory,
          imageType: msg.imageType,
        },
      }],
    });

    this.logger.log(`Instance ${msg.instanceId} scheduled on node ${selectedNode.id}`);
  }

  private async onWorkerHeartbeat(msg: WorkerHeartbeat): Promise<void> {
    await this.registry.upsertNode(msg);
  }

  private async onProvisioned(msg: InstanceProvisionedMsg): Promise<void> {
    await this.registry.confirmReservation(msg.instanceId);
    this.logger.log(`Reservation confirmed for instance ${msg.instanceId}`);
  }

  private async onTerminated(msg: InstanceTerminatedMsg): Promise<void> {
    await this.registry.releaseResources(msg.instanceId);
    this.logger.log(`Resources released for instance ${msg.instanceId}`);
  }
}
