import { Global, Module } from '@nestjs/common';
import { ProvisioningService } from './provisioning.service';
import { PortAllocatorService } from './port-allocator.service';

@Global()
@Module({
  providers: [ProvisioningService, PortAllocatorService],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
