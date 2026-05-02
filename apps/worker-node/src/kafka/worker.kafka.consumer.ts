import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from '@cloud-platform-app/kafka';
import { ProvisioningService } from '../provisioning/provisioning.service';
import { NgrokService } from '../ngrok/ngrok.service';

interface InstanceScheduledMsg {
  instanceId: string;
  targetNodeId: string;
  cpu: number;
  memory: number;
  imageType: string;
  publicKey: string;
}

interface TerminationRequestedMsg {
  instanceId: string;
  containerId: string;
  workerNodeId: string;
}

@Injectable()
export class WorkerKafkaConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkerKafkaConsumer.name);
  private readonly nodeId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly kafka: KafkaService,
    private readonly provisioning: ProvisioningService,
    private readonly ngrok: NgrokService,
  ) {
    this.nodeId = this.config.getOrThrow('WORKER_NODE_ID');
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.createConsumer(
      ['instance.scheduled', 'instance.termination.requested'],
      this.handleMessage.bind(this),
    );
    this.logger.log('Worker Kafka consumer subscribed');
  }

  private async handleMessage(topic: string, payload: unknown): Promise<void> {
    switch (topic) {
      case 'instance.scheduled':
        return this.onInstanceScheduled(payload as InstanceScheduledMsg);
      case 'instance.termination.requested':
        return this.onTerminationRequested(payload as TerminationRequestedMsg);
    }
  }

  private async onInstanceScheduled(msg: InstanceScheduledMsg): Promise<void> {
    if (msg.targetNodeId !== this.nodeId) return;

    this.logger.log(
      `Provisioning instance ${msg.instanceId} (cpu=${msg.cpu}, mem=${msg.memory})`,
    );

    await this.kafka.publish({
      topic: 'instance.provisioning',
      messages: [
        { key: msg.instanceId, value: { instanceId: msg.instanceId } },
      ],
    });

    try {
      const info = await this.provisioning.provisionContainer(msg);

      const ip = this.ngrok.isReady ? this.ngrok.tunnelHost : '127.0.0.1';
      const sshPort = this.ngrok.isReady
        ? this.ngrok.tunnelPort
        : info.hostPort;
      const webUrl = this.ngrok.hasHttpTunnel
        ? `${this.ngrok.httpTunnelUrl}/${msg.instanceId}`
        : null;

      await this.kafka.publish({
        topic: 'instance.provisioned',
        messages: [
          {
            key: msg.instanceId,
            value: {
              instanceId: msg.instanceId,
              workerNodeId: this.nodeId,
              containerId: info.containerId,
              sshPort,
              ip,
              webUrl,
            },
          },
        ],
      });

      this.logger.log(
        `Instance ${msg.instanceId} provisioned — SSH: ${ip}:${sshPort}`,
      );
    } catch (err) {
      this.logger.error(`Failed to provision instance ${msg.instanceId}`, err);
      await this.kafka.publish({
        topic: 'instance.provision.failed',
        messages: [
          {
            key: msg.instanceId,
            value: {
              instanceId: msg.instanceId,
              reason: (err as Error).message,
            },
          },
        ],
      });
    }
  }

  private async onTerminationRequested(
    msg: TerminationRequestedMsg,
  ): Promise<void> {
    if (msg.workerNodeId !== this.nodeId) return;

    this.logger.log(`Terminating instance ${msg.instanceId}`);

    try {
      const { cpu, memory } = await this.provisioning.terminateContainer(
        msg.instanceId,
      );

      await this.kafka.publish({
        topic: 'instance.terminated',
        messages: [
          {
            key: msg.instanceId,
            value: {
              instanceId: msg.instanceId,
              workerNodeId: this.nodeId,
              cpu,
              memory,
            },
          },
        ],
      });

      this.logger.log(`Instance ${msg.instanceId} terminated`);
    } catch (err) {
      this.logger.error(`Failed to terminate instance ${msg.instanceId}`, err);
    }
  }
}
