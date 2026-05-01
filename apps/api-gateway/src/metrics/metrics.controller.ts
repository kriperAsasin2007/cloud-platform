import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MetricsClientService, MetricsQueryParams } from '@cloud-platform-app/metrics-client';
import { UserId } from '../auth/user-id.decorator';

@ApiTags('metrics')
@ApiBearerAuth('access-token')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsClient: MetricsClientService) {}

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get metrics for a specific instance' })
  @ApiParam({ name: 'id', description: 'Instance UUID', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max number of data points to return' })
  @ApiQuery({ name: 'since', required: false, type: String, description: 'Return metrics after this ISO 8601 timestamp' })
  getInstanceMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('since') since?: string,
  ) {
    const params: MetricsQueryParams = {};
    if (limit !== undefined) params.limit = limit;
    if (since) params.since = since;
    return this.metricsClient.getInstanceMetrics(id, params);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get metrics for the authenticated user' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max number of data points to return' })
  @ApiQuery({ name: 'since', required: false, type: String, description: 'Return metrics after this ISO 8601 timestamp' })
  getMyMetrics(
    @UserId() userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('since') since?: string,
  ) {
    const params: MetricsQueryParams = {};
    if (limit !== undefined) params.limit = limit;
    if (since) params.since = since;
    return this.metricsClient.getUserMetrics(userId, params);
  }
}
