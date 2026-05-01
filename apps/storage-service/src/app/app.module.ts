import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '@cloud-platform-app/auth';
import { PrismaModule } from '../prisma/prisma.module';
import { MinioModule } from '../minio/minio.module';
import { BucketsModule } from '../buckets/buckets.module';
import { ObjectsModule } from '../objects/objects.module';
import { StorageMetricsModule } from '../storage-metrics/storage-metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MinioModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        endPoint: config.getOrThrow('MINIO_ENDPOINT'),
        port: parseInt(config.getOrThrow('MINIO_PORT'), 10),
        useSSL: config.get('MINIO_USE_SSL') === 'true',
        accessKey: config.getOrThrow('MINIO_ACCESS_KEY'),
        secretKey: config.getOrThrow('MINIO_SECRET_KEY'),
      }),
    }),
    PrismaModule,
    AuthModule,
    BucketsModule,
    ObjectsModule,
    StorageMetricsModule,
  ],
})
export class AppModule {}
