import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ngrok from '@ngrok/ngrok';

@Injectable()
export class NgrokService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NgrokService.name);
  private listener: Awaited<ReturnType<typeof ngrok.forward>> | null = null;
  private _tunnelHost = '';
  private _tunnelPort = 0;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const authtoken = this.config.get<string>('NGROK_AUTHTOKEN');
    const proxyPort = this.config.get<number>('SSH_PROXY_PORT', 2222);

    if (!authtoken) {
      this.logger.warn('NGROK_AUTHTOKEN not set — SSH tunnel will not be available');
      return;
    }

    this.listener = await ngrok.forward({
      addr: proxyPort,
      authtoken,
      proto: 'tcp',
    });

    const url = this.listener.url() ?? '';
    // url format: "tcp://0.tcp.ngrok.io:12345"
    const withoutProto = url.replace('tcp://', '');
    const colonIdx = withoutProto.lastIndexOf(':');
    this._tunnelHost = withoutProto.slice(0, colonIdx);
    this._tunnelPort = parseInt(withoutProto.slice(colonIdx + 1), 10);

    this.logger.log(`ngrok TCP tunnel: ${url}`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.listener) {
      await this.listener.close();
    }
  }

  get tunnelHost(): string {
    return this._tunnelHost;
  }

  get tunnelPort(): number {
    return this._tunnelPort;
  }

  get isReady(): boolean {
    return this._tunnelPort > 0;
  }
}
