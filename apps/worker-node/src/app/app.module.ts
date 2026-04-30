import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { KafkaModule } from '@cloud-platform-app/kafka';
import { PrismaModule } from '../prisma/prisma.module';
import { NgrokModule } from '../ngrok/ngrok.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { SshProxyModule } from '../ssh-proxy/ssh-proxy.module';
import { HeartbeatModule } from '../heartbeat/heartbeat.module';
import { WorkerKafkaModule } from '../kafka/worker.kafka.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
    NgrokModule,
    ProvisioningModule,
    SshProxyModule,
    HeartbeatModule,
    WorkerKafkaModule,
  ],
})
export class AppModule {}
