import { Injectable } from '@nestjs/common';
import { InstanceStatus } from './instance-status.enum';
import { PrismaService } from '../prisma/prisma.service';
import { Instance } from '@prisma/client/deployment';

export interface CreateInstanceDto {
  id: string;
  userId: string;
  cpuMillicores: number;
  memoryMb: number;
  imageType: string;
}

export interface UpdateStatusMeta {
  workerNodeId?: string;
  containerId?: string;
  sshPort?: number;
  ip?: string;
  terminatedAt?: Date;
}

@Injectable()
export class InstanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  save(dto: CreateInstanceDto): Promise<Instance> {
    return this.prisma.instance.create({
      data: {
        id: dto.id,
        userId: dto.userId,
        cpuMillicores: dto.cpuMillicores,
        memoryMb: dto.memoryMb,
        imageType: dto.imageType,
        status: InstanceStatus.PENDING,
      },
    });
  }

  findById(id: string): Promise<Instance | null> {
    return this.prisma.instance.findUnique({ where: { id } });
  }

  findByUserId(userId: string): Promise<Instance[]> {
    return this.prisma.instance.findMany({ where: { userId } });
  }

  findByWorkerNode(workerNodeId: string): Promise<Instance[]> {
    return this.prisma.instance.findMany({ where: { workerNodeId } });
  }

  updateStatus(
    id: string,
    status: InstanceStatus,
    meta?: UpdateStatusMeta,
  ): Promise<Instance> {
    return this.prisma.instance.update({
      where: { id },
      data: { status, ...meta },
    });
  }

}
