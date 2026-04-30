import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ssh2 from 'ssh2';
import { generateKeyPairSync } from 'crypto';
import { ProvisioningService } from '../provisioning/provisioning.service';

@Injectable()
export class SshProxyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SshProxyService.name);
  private server!: ssh2.Server;

  constructor(
    private readonly config: ConfigService,
    private readonly provisioning: ProvisioningService,
  ) {}

  onModuleInit(): void {
    const port = this.config.get<number>('SSH_PROXY_PORT', 2222);
    const hostKey = this.generateHostKey();

    this.server = new ssh2.Server({ hostKeys: [hostKey] }, (client) => {
      this.handleClient(client);
    });

    this.server.listen(port, '0.0.0.0', () => {
      this.logger.log(`SSH proxy listening on port ${port}`);
    });
  }

  onModuleDestroy(): void {
    this.server?.close();
  }

  private handleClient(client: ssh2.Connection): void {
    let instanceId: string;
    let upstream: ssh2.Client | null = null;

    client.on('authentication', (ctx) => {
      instanceId = ctx.username;

      (async () => {
        const info = await this.provisioning.getContainerByInstanceId(instanceId);

        if (!info) {
          this.logger.warn(`SSH auth rejected — unknown instance: ${instanceId}`);
          ctx.reject();
          return;
        }

        if (!info.userPublicKey) {
          this.logger.warn(
            `SSH auth rejected — instance ${instanceId} has no registered public key (was it created before key-auth was enabled?)`,
          );
          ctx.reject();
          return;
        }

        if (ctx.method !== 'publickey') {
          ctx.reject(['publickey']);
          return;
        }

        // Compare raw key bytes directly — avoids any parseKey→getPublicSSH round-trip
        // reencoding. The middle token of an OpenSSH public key IS the base64 of the
        // SSH wire blob, identical to what the client sends as ctx.key.data.
        const storedParts = info.userPublicKey.trim().split(/\s+/);
        if (storedParts.length < 2) {
          this.logger.warn(
            `SSH auth rejected — malformed stored key for instance: ${instanceId}`,
          );
          ctx.reject();
          return;
        }
        const storedBlob = Buffer.from(storedParts[1], 'base64');

        this.logger.debug(
          `Auth [${instanceId}] algo=${ctx.key.algo} client_len=${ctx.key.data.length} stored_len=${storedBlob.length}`,
        );

        if (!ctx.key.data.equals(storedBlob)) {
          this.logger.warn(
            `SSH auth rejected — key mismatch for instance: ${instanceId}`,
          );
          ctx.reject();
          return;
        }

        if (ctx.signature) {
          if (!ctx.blob) {
            ctx.reject();
            return;
          }
          const parsedKey = ssh2.utils.parseKey(info.userPublicKey.trim());
          if (
            !parsedKey ||
            parsedKey instanceof Error ||
            Array.isArray(parsedKey)
          ) {
            this.logger.warn(
              `SSH auth rejected — stored key unparseable for instance: ${instanceId}`,
            );
            ctx.reject();
            return;
          }
          // ctx.hashAlgo is already set by ssh2: 'sha256' for rsa-sha2-256,
          // 'sha512' for rsa-sha2-512, undefined for legacy ssh-rsa (SHA-1).
          // ctx.key.algo is always normalized to 'ssh-rsa' so we must NOT derive
          // the hash from it — use ctx.hashAlgo directly.
          const result = parsedKey.verify(ctx.blob, ctx.signature, ctx.hashAlgo);
          if (result !== true) {
            this.logger.warn(
              `SSH auth rejected — signature verification failed for instance: ${instanceId} (result=${result})`,
            );
            ctx.reject();
            return;
          }
        }

        ctx.accept();
      })().catch(() => ctx.reject());
    });

    client.on('ready', () => {
      (async () => {
        const info = await this.provisioning.getContainerByInstanceId(instanceId);
        if (!info?.proxyPrivateKey) {
          client.end();
          return;
        }

        const up = new ssh2.Client();
        upstream = up;

        up.on('ready', () => {
          this.logger.log(
            `SSH proxy: ${instanceId} → localhost:${info.hostPort}`,
          );

          client.on('session', (accept) => {
            const session = accept();
            this.forwardSession(session, up);
          });

          // TCP forward requests (e.g. ssh -L tunnelling)
          client.on('tcpip', (accept, _reject, tcpInfo) => {
            up.forwardOut(
              tcpInfo.srcIP,
              tcpInfo.srcPort,
              tcpInfo.destIP,
              tcpInfo.destPort,
              (err, upStream) => {
                if (err) {
                  accept().close();
                  return;
                }
                const channel = accept();
                channel.pipe(upStream).pipe(channel);
              },
            );
          });
        });

        up.on('error', (err) => {
          this.logger.error(
            `Upstream SSH error for ${instanceId}: ${err.message}`,
          );
          client.end();
        });

        up.connect({
          host: '127.0.0.1',
          port: info.hostPort,
          username: 'user',
          privateKey: info.proxyPrivateKey,
          readyTimeout: 20_000,
        });
      })().catch(() => client.end());
    });

    client.on('error', (err) => {
      this.logger.debug(`Client SSH error: ${err.message}`);
    });

    client.on('close', () => {
      upstream?.end();
    });
  }

  private forwardSession(
    session: ssh2.ServerChannel,
    upstream: ssh2.Client,
  ): void {
    let pty: { cols: number; rows: number } | null = null;

    session.on('pty', (accept, _reject, info) => {
      pty = { cols: info.cols, rows: info.rows };
      accept?.();
    });

    session.on('window-change', (_accept, _reject, info) => {
      // resize is handled per-stream below
      void info;
    });

    session.on('shell', (accept) => {
      const stream = accept();
      upstream.shell(
        pty ? { cols: pty.cols, rows: pty.rows } : false,
        (err, upStream) => {
          if (err) {
            stream.close();
            return;
          }
          stream.pipe(upStream).pipe(stream);
          upStream.stderr?.pipe(stream.stderr); // ← upstream stderr → client stderr
        },
      );
    });

    session.on('exec', (accept, _reject, info) => {
      const stream = accept();
      upstream.exec(info.command, (err, upStream) => {
        if (err) {
          stream.close();
          return;
        }
        stream.pipe(upStream).pipe(stream);
        upStream.stderr?.pipe(stream.stderr);
        upStream.on('close', (code: number) => {
          stream.exit(code ?? 0);
          stream.end();
        });
      });
    });

    session.on('sftp', (accept) => {
      const clientStream = accept();
      upstream.sftp((err, sftpStream) => {
        if (err) {
          clientStream.end();
          return;
        }
        clientStream.pipe(sftpStream).pipe(clientStream);
      });
    });
  }

  private generateHostKey(): Buffer {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    return Buffer.from(
      privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
    );
  }
}
