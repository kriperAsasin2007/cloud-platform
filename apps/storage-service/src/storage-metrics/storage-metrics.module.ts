import { Module } from '@nestjs/common';
import { StorageMetricsController } from './storage-metrics.controller';
import { StorageMetricsService } from './storage-metrics.service';

@Module({
  controllers: [StorageMetricsController],
  providers: [StorageMetricsService],
})
export class StorageMetricsModule {}
