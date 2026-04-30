export const METRICS_CLIENT_OPTIONS = 'METRICS_CLIENT_OPTIONS';

export interface MetricsClientOptions {
  metricsServiceUrl: string;
  internalJwtSecret: string;
}
