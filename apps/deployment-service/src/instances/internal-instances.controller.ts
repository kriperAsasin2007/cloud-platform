import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalJwtGuard } from '@cloud-platform-app/auth';
import { InstanceRepository } from './instance.repository';

@Controller('internal/instances')
@UseGuards(InternalJwtGuard)
export class InternalInstancesController {
  constructor(private readonly repo: InstanceRepository) {}

  @Get()
  getUserInstances(@Query('userId') userId: string) {
    return this.repo.findByUserId(userId);
  }
}
