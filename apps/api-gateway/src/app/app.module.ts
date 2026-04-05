import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@cloud-platform-app/kafka';
import { InstancesController } from '../instances/instances.controller';
import { InstancesService } from '../instances/instances.service';
import { EventsGateway } from '../websockets/events.gateway';
import { ApiGatewayKafkaConsumer } from '../kafka/api-gateway.kafka.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    KafkaModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        clientId: config.getOrThrow('KAFKA_CLIENT_ID'),
        brokers: config.getOrThrow<string>('KAFKA_BROKERS').split(','),
        groupId: config.getOrThrow('KAFKA_GROUP_ID'),
      }),
    }),
  ],
  controllers: [InstancesController],
  providers: [InstancesService, EventsGateway, ApiGatewayKafkaConsumer],
})
export class AppModule {}
