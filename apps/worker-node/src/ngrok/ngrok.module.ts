import { Global, Module } from '@nestjs/common';
import { NgrokService } from './ngrok.service';

@Global()
@Module({
  providers: [NgrokService],
  exports: [NgrokService],
})
export class NgrokModule {}
