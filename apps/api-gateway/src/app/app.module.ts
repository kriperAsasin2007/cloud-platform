import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@cloud-platform-app/kafka';
import { MetricsClientModule } from '@cloud-platform-app/metrics-client';
import { UsersClientModule } from '@cloud-platform-app/users-client';
import { DeploymentClientModule } from '@cloud-platform-app/deployment-client';
import { StorageClientModule } from '@cloud-platform-app/storage-client';
import { JwtMiddleware } from '../auth/jwt.middleware';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { InstancesController } from '../instances/instances.controller';
import { InstancesService } from '../instances/instances.service';
import { EventsGateway } from '../websockets/events.gateway';
import { ApiGatewayKafkaConsumer } from '../kafka/api-gateway.kafka.consumer';
import { MetricsController } from '../metrics/metrics.controller';
import { StorageController } from '../storage/storage.controller';

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
    MetricsClientModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        metricsServiceUrl: config.getOrThrow('METRICS_SERVICE_URL'),
        internalJwtSecret: config.getOrThrow('INTERNAL_JWT_SECRET'),
      }),
    }),
    UsersClientModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        usersServiceUrl: config.getOrThrow('USERS_SERVICE_URL'),
        internalJwtSecret: config.getOrThrow('INTERNAL_JWT_SECRET'),
      }),
    }),
    DeploymentClientModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        deploymentServiceUrl: config.getOrThrow('DEPLOYMENT_SERVICE_URL'),
        internalJwtSecret: config.getOrThrow('INTERNAL_JWT_SECRET'),
      }),
    }),
    StorageClientModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storageServiceUrl: config.getOrThrow('STORAGE_SERVICE_URL'),
        internalJwtSecret: config.getOrThrow('INTERNAL_JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController, InstancesController, MetricsController, StorageController],
  providers: [AuthService, InstancesService, EventsGateway, ApiGatewayKafkaConsumer],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(JwtMiddleware)
      .forRoutes(
        { path: 'instances', method: RequestMethod.GET },
        { path: 'instances', method: RequestMethod.POST },
        { path: 'instances/:id', method: RequestMethod.DELETE },
        { path: 'metrics/me', method: RequestMethod.GET },
        { path: 'metrics/instances/:id', method: RequestMethod.GET },
        { path: 'storage/*path', method: RequestMethod.ALL },
      );
  }
}
