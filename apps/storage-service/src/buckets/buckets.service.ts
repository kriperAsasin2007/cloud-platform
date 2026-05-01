import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Bucket } from '@prisma/client/storage';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { CreateBucketDto } from './dto/create-bucket.dto';

export interface BucketResponse {
  id: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class BucketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async create(dto: CreateBucketDto): Promise<BucketResponse> {
    const existing = await this.prisma.bucket.findUnique({
      where: {
        userId_displayName: {
          userId: dto.userId,
          displayName: dto.name,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`Bucket '${dto.name}' already exists`);
    }

    const bucket = await this.prisma.bucket.create({
      data: { displayName: dto.name, userId: dto.userId },
    });

    await this.minio.createBucket(bucket.id);
    return this.toResponse(bucket);
  }

  async list(userId: string): Promise<BucketResponse[]> {
    const buckets = await this.prisma.bucket.findMany({ where: { userId } });
    return buckets.map((b) => this.toResponse(b));
  }

  async delete(userId: string, name: string): Promise<void> {
    const bucket = await this.findAndValidate(userId, name);
    await this.minio.deleteBucket(bucket.id);
    await this.prisma.bucket.delete({ where: { id: bucket.id } });
  }

  async findAndValidate(userId: string, displayName: string): Promise<Bucket> {
    const bucket = await this.prisma.bucket.findUnique({
      where: { userId_displayName: { userId, displayName } },
    });
    if (!bucket) {
      throw new NotFoundException(`Bucket '${displayName}' not found`);
    }
    return bucket;
  }

  private toResponse(bucket: Bucket): BucketResponse {
    return {
      id: bucket.id,
      name: bucket.displayName,
      createdAt: bucket.createdAt,
    };
  }
}
