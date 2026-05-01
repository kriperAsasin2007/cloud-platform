import { apiClient } from './axios';
import type {
  Bucket,
  ObjectItem,
  ObjectStat,
  UploadResult,
  StorageMetrics,
} from '../types/storage.types';

export const storageApi = {
  // ── Buckets ──────────────────────────────────────────────────────────────

  createBucket: async (name: string): Promise<Bucket> => {
    const { data } = await apiClient.post('/storage/buckets', { name });
    return data;
  },

  listBuckets: async (): Promise<Bucket[]> => {
    const { data } = await apiClient.get('/storage/buckets');
    return data;
  },

  deleteBucket: async (name: string): Promise<void> => {
    await apiClient.delete(`/storage/buckets/${encodeURIComponent(name)}`);
  },

  // ── Objects ───────────────────────────────────────────────────────────────

  uploadObject: async (
    bucket: string,
    file: File,
    key?: string,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (key) formData.append('key', key);
    if (metadata) formData.append('metadata', JSON.stringify(metadata));
    const { data } = await apiClient.post(
      `/storage/buckets/${encodeURIComponent(bucket)}/objects`,
      formData,
    );
    return data;
  },

  listObjects: async (
    bucket: string,
    prefix?: string,
    recursive?: boolean,
  ): Promise<ObjectItem[]> => {
    const { data } = await apiClient.get(
      `/storage/buckets/${encodeURIComponent(bucket)}/objects`,
      { params: { prefix, recursive } },
    );
    return data;
  },

  downloadObject: async (bucket: string, key: string): Promise<void> => {
    const response = await apiClient.get(
      `/storage/buckets/${encodeURIComponent(bucket)}/objects/download`,
      { params: { key }, responseType: 'blob' },
    );
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    const disposition = response.headers['content-disposition'] as string | undefined;
    a.download =
      disposition?.match(/filename="(.+)"/)?.[1] ?? key.split('/').pop() ?? key;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  statObject: async (bucket: string, key: string): Promise<ObjectStat> => {
    const { data } = await apiClient.get(
      `/storage/buckets/${encodeURIComponent(bucket)}/objects/stat`,
      { params: { key } },
    );
    return data;
  },

  deleteObject: async (bucket: string, key: string): Promise<void> => {
    await apiClient.delete(
      `/storage/buckets/${encodeURIComponent(bucket)}/objects`,
      { params: { key } },
    );
  },

  updateObjectMetadata: async (
    bucket: string,
    key: string,
    metadata: Record<string, string>,
  ): Promise<void> => {
    await apiClient.patch(
      `/storage/buckets/${encodeURIComponent(bucket)}/objects/metadata`,
      { key, metadata },
    );
  },

  // ── Folders ───────────────────────────────────────────────────────────────

  createFolder: async (bucket: string, path: string): Promise<void> => {
    await apiClient.post(
      `/storage/buckets/${encodeURIComponent(bucket)}/folders`,
      { path },
    );
  },

  // ── Metrics ───────────────────────────────────────────────────────────────

  getStorageMetrics: async (): Promise<StorageMetrics> => {
    const { data } = await apiClient.get('/storage/metrics');
    return data;
  },
};
