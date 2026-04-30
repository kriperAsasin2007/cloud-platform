import { BadRequestException, Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { KafkaService } from '@cloud-platform-app/kafka';
import { v4 as uuidv4 } from 'uuid';

export class CreateInstanceDto {
  @ApiProperty({ example: 500, description: 'CPU in millicores (e.g. 500 = 0.5 vCPU)' })
  cpu!: number;

  @ApiProperty({ example: 512, description: 'Memory in MB' })
  memory!: number;

  @ApiProperty({ example: 'ubuntu', description: 'Docker image type' })
  imageType!: string;

  @ApiProperty({ example: 'ssh-rsa AAAA...', description: 'SSH public key for instance access' })
  sshPublicKey!: string;
}

@Injectable()
export class InstancesService {
  constructor(private readonly kafka: KafkaService) {}

  async requestCreate(
    userId: string,
    dto: CreateInstanceDto,
  ): Promise<{ instanceId: string }> {
    if (!dto.sshPublicKey?.trim()) {
      throw new BadRequestException('sshPublicKey is required');
    }

    const instanceId = uuidv4();

    await this.kafka.publish({
      topic: 'instance.requested',
      messages: [
        {
          key: instanceId,
          value: {
            instanceId,
            userId,
            cpu: dto.cpu,
            memory: dto.memory,
            imageType: dto.imageType,
            publicKey: dto.sshPublicKey,
          },
        },
      ],
    });

    return { instanceId };
  }

  async requestTerminate(instanceId: string, userId: string): Promise<void> {
    await this.kafka.publish({
      topic: 'instance.terminate',
      messages: [
        {
          key: instanceId,
          value: { instanceId, userId },
        },
      ],
    });
  }
}
