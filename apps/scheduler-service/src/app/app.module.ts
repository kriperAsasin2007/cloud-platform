import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@cloud-platform-app/kafka';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaderElectionModule } from '../leader-election/leader-election.module';
import { SchedulerKafkaConsumer } from '../kafka/scheduler.kafka.consumer';

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
    LeaderElectionModule,
  ],
  providers: [SchedulerKafkaConsumer],
})
export class AppModule {}
