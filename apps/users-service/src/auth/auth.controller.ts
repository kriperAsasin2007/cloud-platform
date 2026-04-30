import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { InternalJwtGuard } from '@cloud-platform-app/auth';
import { AuthService } from './auth.service';

@Controller('internal/auth')
@UseGuards(InternalJwtGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('validate')
  validate(@Body() body: { username: string; password: string }) {
    return this.authService.validateCredentials(body.username, body.password);
  }
}
