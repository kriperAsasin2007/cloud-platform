import { Injectable, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService, ObjectItem, ObjectStat } from '../minio/minio.service';
import { BucketsService } from '../buckets/buckets.service';

export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  contentType: string;
  metadata: Record<string, string>;
}

export interface DownloadResult {
  stream: Readable;
  stat: ObjectStat;
}

@Injectable()
export class ObjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly buckets: BucketsService,
  ) {}

  async upload(
    userId: string,
    bucketName: string,
    file: Express.Multer.File,
    key?: string,
    userMeta: Record<string, string> = {},
  ): Promise<UploadResult> {
    const bucket = await this.buckets.findAndValidate(userId, bucketName);
    const objectKey = key ?? file.originalname;
    const contentType = file.mimetype ?? 'application/octet-stream';

    await this.minio.putObject(
      bucket.id,
      objectKey,
      file.buffer,
      contentType,
      userMeta,
    );

    await this.prisma.objectMetadata.upsert({
      where: { bucketId_objectKey: { bucketId: bucket.id, objectKey } },
      update: { userMeta },
      create: { bucketId: bucket.id, objectKey, userMeta },
    });

    return {
      key: objectKey,
      bucket: bucketName,
      size: file.size,
      contentType,
      metadata: userMeta,
    };
  }

  async list(
    userId: string,
    bucketName: string,
    prefix?: string,
    recursive = false,
  ): Promise<ObjectItem[]> {
    const bucket = await this.buckets.findAndValidate(userId, bucketName);
    return this.minio.listObjects(bucket.id, prefix, recursive);
  }

  async download(
    userId: string,
    bucketName: string,
    key: string,
  ): Promise<DownloadResult> {
    const bucket = await this.buckets.findAndValidate(userId, bucketName);
    const stat = await this.minio.statObject(bucket.id, key);
    const stream = await this.minio.getObject(bucket.id, key);
    return { stream, stat };
  }

  async stat(
    userId: string,
    bucketName: string,
    key: string,
  ): Promise<ObjectStat & { metadata: Record<string, string> }> {
    const bucket = await this.buckets.findAndValidate(userId, bucketName);
    const minioStat = await this.minio.statObject(bucket.id, key);

    const metaRecord = await this.prisma.objectMetadata.findUnique({
      where: { bucketId_objectKey: { bucketId: bucket.id, objectKey: key } },
    });

    return {
      ...minioStat,
      metadata: (metaRecord?.userMeta as Record<string, string>) ?? {},
    };
  }

  async deleteObject(
    userId: string,
    bucketName: string,
    key: string,
  ): Promise<void> {
    const bucket = await this.buckets.findAndValidate(userId, bucketName);
    await this.minio.removeObject(bucket.id, key);
    await this.prisma.objectMetadata
      .delete({
        where: { bucketId_objectKey: { bucketId: bucket.id, objectKey: key } },
      })
      .catch(() => undefined);
  }

  async updateMetadata(
    userId: string,
    bucketName: string,
    key: string,
    userMeta: Record<string, string>,
  ): Promise<void> {
    const bucket = await this.buckets.findAndValidate(userId, bucketName);

    const exists = await this.minio
      .statObject(bucket.id, key)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      throw new NotFoundException(`Object '${key}' not found`);
    }

    await this.prisma.objectMetadata.upsert({
      where: { bucketId_objectKey: { bucketId: bucket.id, objectKey: key } },
      update: { userMeta },
      create: { bucketId: bucket.id, objectKey: key, userMeta },
    });
  }

  async createFolder(
    userId: string,
    bucketName: string,
    folderPath: string,
  ): Promise<void> {
    const bucket = await this.buckets.findAndValidate(userId, bucketName);
    await this.minio.createFolder(bucket.id, folderPath);
  }
}
