export type InstanceStatus =
  | 'PENDING'
  | 'SCHEDULING'
  | 'PROVISIONING'
  | 'RUNNING'
  | 'TERMINATING'
  | 'TERMINATED'
  | 'FAILED';

export interface Instance {
  id: string;
  userId: string;
  status: InstanceStatus;
  cpuMillicores: number;
  memoryMb: number;
  imageType: string;
  workerNodeId: string | null;
  containerId: string | null;
  sshPort: number | null;
  ip: string | null;
  webUrl: string | null;
  createdAt: string;
  updatedAt: string;
  terminatedAt: string | null;
}

export interface CreateInstanceRequest {
  cpu: number;
  memory: number;
  imageType: string;
  sshPublicKey: string;
}

export interface InstanceStatusEvent {
  instanceId: string;
  status: InstanceStatus;
  sshPort?: number;
  ip?: string;
  webUrl?: string;
  reason?: string;
}
