import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ngrok from '@ngrok/ngrok';

@Injectable()
export class NgrokService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NgrokService.name);
  private tcpListener: Awaited<ReturnType<typeof ngrok.forward>> | null = null;
  private httpListener: Awaited<ReturnType<typeof ngrok.forward>> | null = null;
  private _tunnelHost = '';
  private _tunnelPort = 0;
  private _httpTunnelUrl = '';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const authtoken = this.config.get<string>('NGROK_AUTHTOKEN');
    if (!authtoken) {
      this.logger.warn(
        'NGROK_AUTHTOKEN not set — SSH and HTTP tunnels will not be available',
      );
      return;
    }

    const sshProxyPort = this.config.get<number>('SSH_PROXY_PORT', 2222);
    const webProxyPort = this.config.get<number>('WEB_PROXY_PORT', 5004);

    await Promise.all([
      this.startTcpTunnel(authtoken, sshProxyPort),
      this.startHttpTunnel(authtoken, webProxyPort),
    ]);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.tcpListener?.close(), this.httpListener?.close()]);
  }

  private async startTcpTunnel(authtoken: string, port: number): Promise<void> {
    this.tcpListener = await ngrok.forward({
      addr: port,
      authtoken,
      proto: 'tcp',
    });
    const url = this.tcpListener.url() ?? '';
    const withoutProto = url.replace('tcp://', '');
    const colonIdx = withoutProto.lastIndexOf(':');
    this._tunnelHost = withoutProto.slice(0, colonIdx);
    this._tunnelPort = parseInt(withoutProto.slice(colonIdx + 1), 10);
    this.logger.log(`ngrok TCP tunnel (SSH proxy): ${url}`);
  }

  private async startHttpTunnel(
    authtoken: string,
    port: number,
  ): Promise<void> {
    this.httpListener = await ngrok.forward({
      addr: port,
      authtoken,
      proto: 'http',
    });
    this._httpTunnelUrl = (this.httpListener.url() ?? '').replace(/\/$/, '');
    this.logger.log(`ngrok HTTP tunnel (web proxy): ${this._httpTunnelUrl}`);
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

  get httpTunnelUrl(): string {
    return this._httpTunnelUrl;
  }

  get hasHttpTunnel(): boolean {
    return this._httpTunnelUrl.length > 0;
  }
}
