import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { KafkaService } from '@cloud-platform-app/kafka';
import { EventsGateway } from '../websockets/events.gateway';

interface StatusChangedMsg {
  instanceId: string;
  userId: string;
  status: string;
  sshPort?: number;
  ip?: string;
  reason?: string;
}

interface InstanceFailedMsg {
  instanceId: string;
  userId: string;
  reason: string;
}

@Injectable()
export class ApiGatewayKafkaConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(ApiGatewayKafkaConsumer.name);

  constructor(
    private readonly kafka: KafkaService,
    private readonly events: EventsGateway,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.createConsumer(
      ['instance.status.changed', 'instance.failed'],
      this.handleMessage.bind(this),
    );
    this.logger.log('API Gateway Kafka consumer subscribed');
  }

  private async handleMessage(topic: string, payload: unknown): Promise<void> {
    switch (topic) {
      case 'instance.status.changed': {
        const msg = payload as StatusChangedMsg;
        this.events.pushToUser(msg.userId, 'instance:status', {
          instanceId: msg.instanceId,
          status: msg.status,
          sshPort: msg.sshPort,
          ip: msg.ip,
          reason: msg.reason,
        });
        break;
      }
      case 'instance.failed': {
        const msg = payload as InstanceFailedMsg;
        this.events.pushToUser(msg.userId, 'instance:failed', {
          instanceId: msg.instanceId,
          reason: msg.reason,
        });
        break;
      }
    }
  }
}
