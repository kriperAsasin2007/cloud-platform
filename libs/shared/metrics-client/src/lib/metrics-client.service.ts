import { Inject, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as jwt from 'jsonwebtoken';
import {
  METRICS_CLIENT_OPTIONS,
  MetricsClientOptions,
} from './metrics-client.config';

export interface MetricsQueryParams {
  limit?: number;
  since?: string;
}

@Injectable()
export class MetricsClientService {
  private readonly http: AxiosInstance;

  constructor(
    @Inject(METRICS_CLIENT_OPTIONS)
    private readonly options: MetricsClientOptions,
  ) {
    this.http = axios.create({ baseURL: options.metricsServiceUrl });
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

  async getInstanceMetrics(instanceId: string, params?: MetricsQueryParams) {
    const { data } = await this.http.get(
      `/api/metrics/instances/${instanceId}`,
      { headers: this.authHeader(), params },
    );
    return data;
  }

  async getUserMetrics(userId: string, params?: MetricsQueryParams) {
    const { data } = await this.http.get(`/api/metrics/users/${userId}`, {
      headers: this.authHeader(),
      params,
    });
    return data;
  }

  async getTotalMetrics() {
    const { data } = await this.http.get('/api/metrics/total', {
      headers: this.authHeader(),
    });
    return data;
  }
}
