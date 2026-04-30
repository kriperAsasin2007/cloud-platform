import { Inject, Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as jwt from 'jsonwebtoken';
import { USERS_CLIENT_OPTIONS, UsersClientOptions } from './users-client.config';

export interface LoginResult { id: string; username: string; name: string; }

@Injectable()
export class UsersClientService {
  private readonly http: AxiosInstance;

  constructor(@Inject(USERS_CLIENT_OPTIONS) private readonly options: UsersClientOptions) {
    this.http = axios.create({ baseURL: options.usersServiceUrl });
  }

  private generateToken(): string {
    return jwt.sign({ service: 'api-gateway' }, this.options.internalJwtSecret, { expiresIn: '30s' });
  }

  async validateCredentials(username: string, password: string): Promise<LoginResult> {
    const token = this.generateToken();
    const { data } = await this.http.post<LoginResult>(
      '/api/internal/auth/validate',
      { username, password },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data;
  }
}
