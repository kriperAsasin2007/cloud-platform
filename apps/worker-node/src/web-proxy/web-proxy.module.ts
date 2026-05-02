import { Module } from '@nestjs/common';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { WebProxyService } from './web-proxy.service';

@Module({
  imports: [ProvisioningModule],
  providers: [WebProxyService],
})
export class WebProxyModule {}
