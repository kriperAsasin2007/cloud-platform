import { Controller, Get, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { InternalJwtGuard } from '@cloud-platform-app/auth';
import { StorageMetricsService } from './storage-metrics.service';

@Controller('storage/metrics')
@UseGuards(InternalJwtGuard)
export class StorageMetricsController {
  constructor(private readonly storageMetrics: StorageMetricsService) {}

  @Get()
  getUserMetrics(@Query('userId', ParseUUIDPipe) userId: string) {
    return this.storageMetrics.getUserMetrics(userId);
  }
}
