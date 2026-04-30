import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { UsersClientService } from '@cloud-platform-app/users-client';
import { JwtAccessPayload, JwtRefreshPayload } from '@cloud-platform-app/auth';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly usersClient: UsersClientService,
  ) {}

  async login(username: string, password: string): Promise<TokenPair> {
    const user = await this.usersClient.validateCredentials(username, password);
    return this.issueTokens({ userId: user.id, username: user.username });
  }

  refresh(refreshToken: string): TokenPair {
    const secret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    let payload: JwtRefreshPayload;

    try {
      payload = jwt.verify(refreshToken, secret) as JwtRefreshPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    return this.issueTokens({ userId: payload.userId, username: payload.username });
  }

  private issueTokens(base: { userId: string; username: string }): TokenPair {
    const accessPayload: JwtAccessPayload = { userId: base.userId, username: base.username };
    const refreshPayload: JwtRefreshPayload = { ...accessPayload, tokenType: 'refresh' };

    const accessToken = jwt.sign(accessPayload, this.config.getOrThrow('JWT_SECRET'), { expiresIn: '15m' });
    const refreshToken = jwt.sign(refreshPayload, this.config.getOrThrow('JWT_REFRESH_SECRET'), { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }
}
