import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MetricsClientService, MetricsQueryParams } from '@cloud-platform-app/metrics-client';
import { UserId } from '../auth/user-id.decorator';

@ApiTags('metrics')
@ApiBearerAuth('access-token')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsClient: MetricsClientService) {}

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get metrics for a specific instance' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'since', required: false, type: String, description: 'ISO 8601 date string' })
  getInstanceMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
    @Query('since') since?: string,
  ) {
    const params: MetricsQueryParams = {};
    if (limit) params.limit = parseInt(limit, 10);
    if (since) params.since = since;
    return this.metricsClient.getInstanceMetrics(id, params);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get metrics for the authenticated user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'since', required: false, type: String, description: 'ISO 8601 date string' })
  getMyMetrics(
    @UserId() userId: string,
    @Query('limit') limit?: string,
    @Query('since') since?: string,
  ) {
    const params: MetricsQueryParams = {};
    if (limit) params.limit = parseInt(limit, 10);
    if (since) params.since = since;
    return this.metricsClient.getUserMetrics(userId, params);
  }
}
