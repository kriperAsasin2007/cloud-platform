export interface Bucket {
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
  buckets: BucketStats[];
}

export interface BucketStats {
  name: string;
  objectCount: number;
  totalSizeBytes: number;
}
