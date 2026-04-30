import { Inject, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as jwt from 'jsonwebtoken';
import {
  DEPLOYMENT_CLIENT_OPTIONS,
  DeploymentClientOptions,
} from './deployment-client.config';

export interface InstanceRecord {
  id: string;
  userId: string;
  status: string;
  cpuMillicores: number;
  memoryMb: number;
  imageType: string;
  workerNodeId: string | null;
  containerId: string | null;
  sshPort: number | null;
  ip: string | null;
  createdAt: string;
  updatedAt: string;
  terminatedAt: string | null;
}

@Injectable()
export class DeploymentClientService {
  private readonly http: AxiosInstance;

  constructor(
    @Inject(DEPLOYMENT_CLIENT_OPTIONS)
    private readonly options: DeploymentClientOptions,
  ) {
    this.http = axios.create({ baseURL: options.deploymentServiceUrl });
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

  async getUserInstances(userId: string): Promise<InstanceRecord[]> {
    const { data } = await this.http.get<InstanceRecord[]>(
      '/api/internal/instances',
      { headers: this.authHeader(), params: { userId } },
    );
    return data;
  }
}
