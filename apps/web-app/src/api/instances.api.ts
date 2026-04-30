import { apiClient } from './axios';
import type { Instance, CreateInstanceRequest } from '../types/instance.types';

export async function listInstances(): Promise<Instance[]> {
  const { data } = await apiClient.get<Instance[]>('/instances');
  return data;
}

export async function createInstance(
  req: CreateInstanceRequest,
): Promise<{ instanceId: string }> {
  const { data } = await apiClient.post<{ instanceId: string }>(
    '/instances',
    req,
  );
  return data;
}

export async function terminateInstance(id: string): Promise<void> {
  await apiClient.delete(`/instances/${id}`);
}
