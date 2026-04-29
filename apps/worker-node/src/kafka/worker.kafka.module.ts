import { Module } from '@nestjs/common';
import { WorkerKafkaConsumer } from './worker.kafka.consumer';

@Module({
  providers: [WorkerKafkaConsumer],
})
export class WorkerKafkaModule {}
