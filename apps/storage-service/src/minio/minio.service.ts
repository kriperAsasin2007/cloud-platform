import { Inject, Injectable } from '@nestjs/common';
import { Client } from 'minio';
import { Readable } from 'stream';
import { MINIO_OPTIONS, MinioOptions } from './minio.config';

export interface ObjectStat {
  size: number;
  etag: string;
  contentType: string;
  lastModified: Date;
  metaData: Record<string, string>;
}

export interface ObjectItem {
  key: string;
  size: number;
  etag?: string;
  lastModified?: Date;
  isDirectory: boolean;
}

@Injectable()
export class MinioService {
  private readonly client: Client;

  constructor(
    @Inject(MINIO_OPTIONS)
    options: MinioOptions,
  ) {
    this.client = new Client(options);
  }

  async createBucket(bucketId: string): Promise<void> {
    await this.client.makeBucket(bucketId);
  }

  async deleteBucket(bucketId: string): Promise<void> {
    const objects = await this.listObjects(bucketId, '', true);
    if (objects.length > 0) {
      await this.client.removeObjects(
        bucketId,
        objects.map((o) => o.key),
      );
    }
    await this.client.removeBucket(bucketId);
  }

  async bucketExists(bucketId: string): Promise<boolean> {
    return this.client.bucketExists(bucketId);
  }

  async putObject(
    bucketId: string,
    key: string,
    data: Readable | Buffer,
    contentType: string,
    userMeta: Record<string, string> = {},
  ): Promise<void> {
    const metaData: Record<string, string> = {
      'Content-Type': contentType,
      ...Object.fromEntries(
        Object.entries(userMeta).map(([k, v]) => [
          `x-amz-meta-${k.toLowerCase()}`,
          v,
        ]),
      ),
    };
    await this.client.putObject(bucketId, key, data, undefined, metaData);
  }

  async getObject(bucketId: string, key: string): Promise<Readable> {
    return this.client.getObject(bucketId, key);
  }

  async statObject(bucketId: string, key: string): Promise<ObjectStat> {
    const stat = await this.client.statObject(bucketId, key);
    return {
      size: stat.size,
      etag: stat.etag,
      contentType:
        (stat.metaData?.['content-type'] as string) ??
        'application/octet-stream',
      lastModified: stat.lastModified,
      metaData: (stat.metaData as Record<string, string>) ?? {},
    };
  }

  async removeObject(bucketId: string, key: string): Promise<void> {
    await this.client.removeObject(bucketId, key);
  }

  listObjects(
    bucketId: string,
    prefix = '',
    recursive = false,
  ): Promise<ObjectItem[]> {
    return new Promise((resolve, reject) => {
      const items: ObjectItem[] = [];
      const stream = this.client.listObjectsV2(bucketId, prefix, recursive);
      stream.on('data', (item) => {
        items.push({
          key: item.name ?? item.prefix ?? '',
          size: item.size ?? 0,
          etag: item.etag,
          lastModified: item.lastModified,
          isDirectory: !item.name && Boolean(item.prefix),
        });
      });
      stream.on('error', reject);
      stream.on('end', () => resolve(items));
    });
  }

  async createFolder(bucketId: string, folderPath: string): Promise<void> {
    const key = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    await this.client.putObject(bucketId, key, Buffer.alloc(0), 0, {
      'Content-Type': 'application/x-directory',
    });
  }

  async getBucketStats(
    bucketId: string,
  ): Promise<{ objectCount: number; totalSize: number }> {
    const items = await this.listObjects(bucketId, '', true);
    const realObjects = items.filter((i) => !i.isDirectory);
    return {
      objectCount: realObjects.length,
      totalSize: realObjects.reduce((acc, i) => acc + i.size, 0),
    };
  }
}
