import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  InstanceRepository,
  CreateInstanceDto,
  UpdateStatusMeta,
} from './instance.repository';
import { InstanceStatus } from './instance-status.enum';
import { Instance } from '@prisma/client/deployment';

const MAX_CPU_MILLICORES = 4_000;
const MAX_MEMORY_MB = 8_192;

@Injectable()
export class InstanceService {
  constructor(private readonly repo: InstanceRepository) {}

  createInstanceRecord(dto: CreateInstanceDto): Promise<Instance> {
    return this.repo.save(dto);
  }

  updateInstanceStatus(
    id: string,
    status: InstanceStatus,
    meta?: UpdateStatusMeta,
  ): Promise<Instance> {
    return this.repo.updateStatus(id, status, meta);
  }

  async validateResourceLimits(
    _userId: string,
    cpu: number,
    memory: number,
  ): Promise<void> {
    if (cpu > MAX_CPU_MILLICORES) {
      throw new BadRequestException(
        `CPU request ${cpu}mc exceeds limit of ${MAX_CPU_MILLICORES}mc`,
      );
    }
    if (memory > MAX_MEMORY_MB) {
      throw new BadRequestException(
        `Memory request ${memory}MB exceeds limit of ${MAX_MEMORY_MB}MB`,
      );
    }
  }

  async validateOwnership(
    instanceId: string,
    userId: string,
  ): Promise<Instance> {
    const instance = await this.repo.findById(instanceId);
    if (!instance) {
      throw new BadRequestException(`Instance ${instanceId} not found`);
    }
    if (instance.userId !== userId) {
      throw new ForbiddenException(
        `Instance ${instanceId} does not belong to user`,
      );
    }
    return instance;
  }

  getInstanceWithNode(instanceId: string): Promise<Instance | null> {
    return this.repo.findById(instanceId);
  }
}
