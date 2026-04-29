import { Module } from '@nestjs/common';
import { SshProxyService } from './ssh-proxy.service';

@Module({
  providers: [SshProxyService],
})
export class SshProxyModule {}
