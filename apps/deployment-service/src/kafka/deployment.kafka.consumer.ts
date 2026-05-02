import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { KafkaService } from '@cloud-platform-app/kafka';
import { InstanceService } from '../instances/instance.service';
import { InstanceStatus } from '../instances/instance-status.enum';

interface InstanceRequestedMsg {
  instanceId: string;
  userId: string;
  cpu: number;
  memory: number;
  imageType: string;
  publicKey: string;
}

interface InstanceProvisionedMsg {
  instanceId: string;
  workerNodeId: string;
  containerId: string;
  sshPort: number;
  ip: string;
  webUrl: string | null;
}

interface ProvisionFailedMsg {
  instanceId: string;
  reason: string;
  userId?: string;
}

interface TerminateMsg {
  instanceId: string;
  userId: string;
}

interface TerminatedMsg {
  instanceId: string;
  workerNodeId: string;
  cpu: number;
  memory: number;
}

@Injectable()
export class DeploymentKafkaConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(DeploymentKafkaConsumer.name);

  constructor(
    private readonly kafka: KafkaService,
    private readonly instanceService: InstanceService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.createConsumer(
      [
        'instance.requested',
        'instance.provisioning',
        'instance.provisioned',
        'instance.provision.failed',
        'instance.terminate',
        'instance.terminated',
      ],
      this.handleMessage.bind(this),
    );
    this.logger.log('Deployment Kafka consumer subscribed');
  }

  private async handleMessage(topic: string, payload: unknown): Promise<void> {
    switch (topic) {
      case 'instance.requested':
        return this.onInstanceRequested(payload as InstanceRequestedMsg);
      case 'instance.provisioning':
        return this.onInstanceProvisioning(payload as { instanceId: string });
      case 'instance.provisioned':
        return this.onInstanceProvisioned(payload as InstanceProvisionedMsg);
      case 'instance.provision.failed':
        return this.onProvisionFailed(payload as ProvisionFailedMsg);
      case 'instance.terminate':
        return this.onTerminateRequested(payload as TerminateMsg);
      case 'instance.terminated':
        return this.onTerminated(payload as TerminatedMsg);
    }
  }

  private async onInstanceProvisioning(msg: { instanceId: string }): Promise<void> {
    this.logger.log(`instance.provisioning: ${msg.instanceId}`);
    await this.instanceService.updateInstanceStatus(msg.instanceId, InstanceStatus.PROVISIONING);
  }

  private async onInstanceRequested(msg: InstanceRequestedMsg): Promise<void> {
    this.logger.log(`instance.requested: ${msg.instanceId}`);
    try {
      await this.instanceService.validateResourceLimits(msg.userId, msg.cpu, msg.memory);

      await this.instanceService.createInstanceRecord({
        id: msg.instanceId,
        userId: msg.userId,
        cpuMillicores: msg.cpu,
        memoryMb: msg.memory,
        imageType: msg.imageType,
      });

      await this.instanceService.updateInstanceStatus(msg.instanceId, InstanceStatus.SCHEDULING);

      await this.kafka.publish({
        topic: 'instance.schedule.requested',
        messages: [{
          key: msg.instanceId,
          value: {
            instanceId: msg.instanceId,
            userId: msg.userId,
            cpu: msg.cpu,
            memory: msg.memory,
            imageType: msg.imageType,
            publicKey: msg.publicKey,
          },
        }],
      });

      this.logger.log(`Instance ${msg.instanceId} → SCHEDULING`);
    } catch (err) {
      this.logger.error(`Failed to process instance.requested for ${msg.instanceId}`, err);
      await this.kafka.publish({
        topic: 'instance.failed',
        messages: [{
          key: msg.instanceId,
          value: {
            instanceId: msg.instanceId,
            userId: msg.userId,
            reason: (err as Error).message,
          },
        }],
      });
    }
  }

  private async onInstanceProvisioned(msg: InstanceProvisionedMsg): Promise<void> {
    this.logger.log(`instance.provisioned: ${msg.instanceId}`);
    const instance = await this.instanceService.updateInstanceStatus(
      msg.instanceId,
      InstanceStatus.RUNNING,
      {
        workerNodeId: msg.workerNodeId,
        containerId: msg.containerId,
        sshPort: msg.sshPort,
        ip: msg.ip,
        webUrl: msg.webUrl ?? undefined,
      },
    );

    await this.kafka.publish({
      topic: 'instance.status.changed',
      messages: [{
        key: msg.instanceId,
        value: {
          instanceId: msg.instanceId,
          userId: instance.userId,
          status: InstanceStatus.RUNNING,
          sshPort: msg.sshPort,
          ip: msg.ip,
          webUrl: msg.webUrl,
        },
      }],
    });
  }

  private async onProvisionFailed(msg: ProvisionFailedMsg): Promise<void> {
    this.logger.warn(`instance.provision.failed: ${msg.instanceId} — ${msg.reason}`);
    const instance = await this.instanceService.updateInstanceStatus(
      msg.instanceId,
      InstanceStatus.FAILED,
    );

    await this.kafka.publish({
      topic: 'instance.status.changed',
      messages: [{
        key: msg.instanceId,
        value: {
          instanceId: msg.instanceId,
          userId: instance.userId,
          status: InstanceStatus.FAILED,
          reason: msg.reason,
        },
      }],
    });

    await this.kafka.publish({
      topic: 'instance.failed',
      messages: [{
        key: msg.instanceId,
        value: {
          instanceId: msg.instanceId,
          userId: instance.userId,
          reason: msg.reason,
        },
      }],
    });
  }

  private async onTerminateRequested(msg: TerminateMsg): Promise<void> {
    this.logger.log(`instance.terminate: ${msg.instanceId}`);
    const instance = await this.instanceService.validateOwnership(
      msg.instanceId,
      msg.userId,
    );

    await this.instanceService.updateInstanceStatus(
      msg.instanceId,
      InstanceStatus.TERMINATING,
    );

    await this.kafka.publish({
      topic: 'instance.termination.requested',
      messages: [{
        key: msg.instanceId,
        value: {
          instanceId: msg.instanceId,
          containerId: instance.containerId,
          workerNodeId: instance.workerNodeId,
        },
      }],
    });
  }

  private async onTerminated(msg: TerminatedMsg): Promise<void> {
    this.logger.log(`instance.terminated: ${msg.instanceId}`);
    const instance = await this.instanceService.updateInstanceStatus(
      msg.instanceId,
      InstanceStatus.TERMINATED,
      { terminatedAt: new Date() },
    );

    await this.kafka.publish({
      topic: 'instance.status.changed',
      messages: [{
        key: msg.instanceId,
        value: {
          instanceId: msg.instanceId,
          userId: instance.userId,
          status: InstanceStatus.TERMINATED,
        },
      }],
    });
  }
}
