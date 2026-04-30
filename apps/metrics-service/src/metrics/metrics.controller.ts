import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalJwtGuard } from '@cloud-platform-app/auth';
import { MetricsService } from './metrics.service';

@Controller('metrics')
@UseGuards(InternalJwtGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('instances/:id')
  getInstanceMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit = '100',
    @Query('since') since?: string,
  ) {
    return this.metricsService.getInstanceMetrics(
      id,
      parseInt(limit, 10),
      since ? new Date(since) : undefined,
    );
  }

  @Get('users/:userId')
  getUserMetrics(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit = '100',
    @Query('since') since?: string,
  ) {
    return this.metricsService.getUserMetrics(
      userId,
      parseInt(limit, 10),
      since ? new Date(since) : undefined,
    );
  }

  @Get('total')
  getTotalMetrics() {
    return this.metricsService.getTotalMetrics();
  }
}
