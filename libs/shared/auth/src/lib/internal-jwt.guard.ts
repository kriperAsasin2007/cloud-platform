import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class InternalJwtGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    const authHeader = req.headers['authorization'] ?? '';

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing internal Bearer token');
    }

    const token = authHeader.slice(7);
    const secret = this.config.getOrThrow<string>('INTERNAL_JWT_SECRET');

    try {
      jwt.verify(token, secret);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid internal JWT');
    }
  }
}
