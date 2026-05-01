export interface InstanceMetric {
  id: string;
  instanceId: string;
  userId: string;
  cpuPercent: number;
  memoryMb: number;
  networkInKb: number;
  networkOutKb: number;
  recordedAt: string;
}
