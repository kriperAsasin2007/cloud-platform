import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@cloud-platform-app/kafka';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '@cloud-platform-app/auth';
import { MetricsKafkaConsumer } from '../kafka/metrics.kafka.consumer';
import { MetricsService } from '../metrics/metrics.service';
import { MetricsController } from '../metrics/metrics.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    KafkaModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        clientId: config.getOrThrow('KAFKA_CLIENT_ID'),
        brokers: config.getOrThrow<string>('KAFKA_BROKERS').split(','),
        groupId: config.getOrThrow('KAFKA_GROUP_ID'),
      }),
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsKafkaConsumer],
})
export class AppModule {}
