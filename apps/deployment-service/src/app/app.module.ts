import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@cloud-platform-app/kafka';
import { AuthModule } from '@cloud-platform-app/auth';
import { PrismaModule } from '../prisma/prisma.module';
import { InstanceRepository } from '../instances/instance.repository';
import { InstanceService } from '../instances/instance.service';
import { InternalInstancesController } from '../instances/internal-instances.controller';
import { DeploymentKafkaConsumer } from '../kafka/deployment.kafka.consumer';

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
  controllers: [InternalInstancesController],
  providers: [InstanceRepository, InstanceService, DeploymentKafkaConsumer],
})
export class AppModule {}
