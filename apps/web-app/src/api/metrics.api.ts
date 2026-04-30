import { apiClient } from './axios';
import type { InstanceMetric } from '../types/metrics.types';

export async function getInstanceMetrics(
  instanceId: string,
  limit = 50,
): Promise<InstanceMetric[]> {
  const { data } = await apiClient.get<InstanceMetric[]>(
    `/metrics/instances/${instanceId}`,
    { params: { limit } },
  );
  return data;
}

export async function getMyMetrics(limit = 100): Promise<InstanceMetric[]> {
  const { data } = await apiClient.get<InstanceMetric[]>('/metrics/me', {
    params: { limit },
  });
  return data;
}
