import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';

export interface BucketStats {
  name: string;
  objectCount: number;
  totalSizeBytes: number;
}

export interface StorageMetrics {
  userId: string;
  totalBuckets: number;
  totalObjects: number;
  totalSizeBytes: number;
  buckets: BucketStats[];
}

@Injectable()
export class StorageMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async getUserMetrics(userId: string): Promise<StorageMetrics> {
    const buckets = await this.prisma.bucket.findMany({ where: { userId } });

    const bucketStats = await Promise.all(
      buckets.map(async (b) => {
        const stats = await this.minio.getBucketStats(b.id);
        return {
          name: b.displayName,
          objectCount: stats.objectCount,
          totalSizeBytes: stats.totalSize,
        };
      }),
    );

    return {
      userId,
      totalBuckets: buckets.length,
      totalObjects: bucketStats.reduce((acc, s) => acc + s.objectCount, 0),
      totalSizeBytes: bucketStats.reduce((acc, s) => acc + s.totalSizeBytes, 0),
      buckets: bucketStats,
    };
  }
}
