import { Inject, Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as jwt from 'jsonwebtoken';
import FormData from 'form-data';
import {
  STORAGE_CLIENT_OPTIONS,
  StorageClientOptions,
} from './storage-client.config';

export interface BucketResponse {
  id: string;
  name: string;
  createdAt: string;
}

export interface ObjectItem {
  key: string;
  size: number;
  etag?: string;
  lastModified?: string;
  isDirectory: boolean;
}

export interface ObjectStat {
  size: number;
  etag: string;
  contentType: string;
  lastModified: string;
  metaData: Record<string, string>;
  metadata: Record<string, string>;
}

export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  contentType: string;
  metadata: Record<string, string>;
}

export interface StorageMetrics {
  userId: string;
  totalBuckets: number;
  totalObjects: number;
  totalSizeBytes: number;
  buckets: Array<{
    name: string;
    objectCount: number;
    totalSizeBytes: number;
  }>;
}

@Injectable()
export class StorageClientService {
  private readonly http: AxiosInstance;

  constructor(
    @Inject(STORAGE_CLIENT_OPTIONS)
    private readonly options: StorageClientOptions,
  ) {
    this.http = axios.create({ baseURL: options.storageServiceUrl });
  }

  private generateToken(): string {
    return jwt.sign(
      { service: 'api-gateway' },
      this.options.internalJwtSecret,
      { expiresIn: '30s' },
    );
  }

  private authHeader(): Record<string, string> {
    return { Authorization: `Bearer ${this.generateToken()}` };
  }

  async createBucket(userId: string, name: string): Promise<BucketResponse> {
    const { data } = await this.http.post(
      '/api/storage/buckets',
      { name, userId },
      { headers: this.authHeader() },
    );
    return data;
  }

  async listBuckets(userId: string): Promise<BucketResponse[]> {
    const { data } = await this.http.get('/api/storage/buckets', {
      headers: this.authHeader(),
      params: { userId },
    });
    return data;
  }

  async deleteBucket(userId: string, bucketName: string): Promise<void> {
    await this.http.delete(`/api/storage/buckets/${bucketName}`, {
      headers: this.authHeader(),
      params: { userId },
    });
  }

  async uploadObject(
    userId: string,
    bucketName: string,
    file: Buffer,
    originalname: string,
    mimetype: string,
    key?: string,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    const form = new FormData();
    form.append('file', file, { filename: originalname, contentType: mimetype });
    form.append('userId', userId);
    if (key) form.append('key', key);
    if (metadata) form.append('metadata', JSON.stringify(metadata));

    const { data } = await this.http.post(
      `/api/storage/buckets/${bucketName}/objects`,
      form,
      { headers: { ...this.authHeader(), ...form.getHeaders() } },
    );
    return data;
  }

  async listObjects(
    userId: string,
    bucketName: string,
    prefix?: string,
    recursive?: boolean,
  ): Promise<ObjectItem[]> {
    const { data } = await this.http.get(
      `/api/storage/buckets/${bucketName}/objects`,
      {
        headers: this.authHeader(),
        params: { userId, prefix, recursive },
      },
    );
    return data;
  }

  downloadObject(
    userId: string,
    bucketName: string,
    key: string,
  ): Promise<AxiosResponse> {
    return this.http.get(
      `/api/storage/buckets/${bucketName}/objects/download`,
      {
        headers: this.authHeader(),
        params: { userId, key },
        responseType: 'stream',
      },
    );
  }

  async statObject(
    userId: string,
    bucketName: string,
    key: string,
  ): Promise<ObjectStat> {
    const { data } = await this.http.get(
      `/api/storage/buckets/${bucketName}/objects/stat`,
      {
        headers: this.authHeader(),
        params: { userId, key },
      },
    );
    return data;
  }

  async deleteObject(
    userId: string,
    bucketName: string,
    key: string,
  ): Promise<void> {
    await this.http.delete(
      `/api/storage/buckets/${bucketName}/objects`,
      {
        headers: this.authHeader(),
        params: { userId, key },
      },
    );
  }

  async updateObjectMetadata(
    userId: string,
    bucketName: string,
    key: string,
    metadata: Record<string, string>,
  ): Promise<void> {
    await this.http.patch(
      `/api/storage/buckets/${bucketName}/objects/metadata`,
      { userId, key, metadata },
      { headers: this.authHeader() },
    );
  }

  async createFolder(
    userId: string,
    bucketName: string,
    path: string,
  ): Promise<void> {
    await this.http.post(
      `/api/storage/buckets/${bucketName}/folders`,
      { userId, path },
      { headers: this.authHeader() },
    );
  }

  async getStorageMetrics(userId: string): Promise<StorageMetrics> {
    const { data } = await this.http.get('/api/storage/metrics', {
      headers: this.authHeader(),
      params: { userId },
    });
    return data;
  }
}
