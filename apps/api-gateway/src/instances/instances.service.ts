import { Injectable } from '@nestjs/common';
import { KafkaService } from '@cloud-platform-app/kafka';
import { v4 as uuidv4 } from 'uuid';

export interface CreateInstanceDto {
  cpu: number;
  memory: number;
  imageType: string;
}

@Injectable()
export class InstancesService {
  constructor(private readonly kafka: KafkaService) {}

  async requestCreate(userId: string, dto: CreateInstanceDto): Promise<{ instanceId: string }> {
    const instanceId = uuidv4();

    await this.kafka.publish({
      topic: 'instance.requested',
      messages: [{
        key: instanceId,
        value: {
          instanceId,
          userId,
          cpu: dto.cpu,
          memory: dto.memory,
          imageType: dto.imageType,
        },
      }],
    });

    return { instanceId };
  }

  async requestTerminate(instanceId: string, userId: string): Promise<void> {
    await this.kafka.publish({
      topic: 'instance.terminate',
      messages: [{
        key: instanceId,
        value: { instanceId, userId },
      }],
    });
  }
}
