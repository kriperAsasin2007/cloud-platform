import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  userId: string;
}

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const authHeader = (req.headers['authorization'] as string) ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authHeader.slice(7);
    const secret = this.config.getOrThrow<string>('JWT_SECRET');

    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      req.userId = payload.userId;
      next();
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
