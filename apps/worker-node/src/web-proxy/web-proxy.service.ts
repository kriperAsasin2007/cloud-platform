import * as http from 'http';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProvisioningService } from '../provisioning/provisioning.service';

@Injectable()
export class WebProxyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebProxyService.name);
  private server!: http.Server;

  constructor(
    private readonly config: ConfigService,
    private readonly provisioning: ProvisioningService,
  ) {}

  async onModuleInit(): Promise<void> {
    const port = this.config.get<number>('WEB_PROXY_PORT', 5004);
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch(() => {
        if (!res.headersSent) res.writeHead(500).end('Internal proxy error');
      });
    });
    await new Promise<void>((resolve) => this.server.listen(port, resolve));
    this.logger.log(
      `Web proxy listening on port ${port} — route: /{instanceId}/`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await new Promise<void>((resolve, reject) =>
      this.server.close((err) => (err ? reject(err) : resolve())),
    );
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    // URL pattern: /{instanceId}[/rest-of-path][?query]
    const rawUrl = req.url ?? '/';
    const withoutLeadingSlash = rawUrl.startsWith('/')
      ? rawUrl.slice(1)
      : rawUrl;
    const slashIdx = withoutLeadingSlash.indexOf('/');
    const instanceId =
      slashIdx >= 0
        ? withoutLeadingSlash.slice(0, slashIdx)
        : withoutLeadingSlash;
    const targetPath =
      slashIdx >= 0 ? withoutLeadingSlash.slice(slashIdx) : '/';

    if (!instanceId) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Usage: /{instanceId}/');
      return;
    }

    const container =
      await this.provisioning.getContainerByInstanceId(instanceId);
    if (!container?.webPort) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Instance ${instanceId} not found or has no web port`);
      return;
    }

    const proxyReq = http.request(
      {
        hostname: 'localhost',
        port: container.webPort,
        path: targetPath || '/',
        method: req.method,
        headers: { ...req.headers, host: `localhost:${container.webPort}` },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      },
    );

    proxyReq.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway — container web server not responding');
      }
    });

    req.pipe(proxyReq, { end: true });
  }
}
