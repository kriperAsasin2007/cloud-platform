import { Module } from '@nestjs/common';
import { InternalJwtGuard } from './internal-jwt.guard';

@Module({
  providers: [InternalJwtGuard],
  exports: [InternalJwtGuard],
})
export class AuthModule {}
