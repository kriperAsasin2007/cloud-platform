export const MINIO_OPTIONS = 'MINIO_OPTIONS';

export interface MinioOptions {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
}
