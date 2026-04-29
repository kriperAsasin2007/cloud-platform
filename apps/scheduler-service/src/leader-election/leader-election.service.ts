import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as zookeeper from 'node-zookeeper-client';
import { EventEmitter } from 'events';
import { NodeHealthMonitor } from '../scheduler/node-health.monitor';

const ELECTION_PATH = '/scheduler-election';

@Injectable()
export class LeaderElectionService
  extends EventEmitter
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(LeaderElectionService.name);
  private client!: zookeeper.Client;
  private myZnodePath: string | null = null;
  private _isLeader = false;
  private destroyed = false;

  constructor(
    private readonly config: ConfigService,
    private readonly healthMonitor: NodeHealthMonitor,
  ) {
    super();
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    this.destroyed = true;
    if (this._isLeader) {
      this.healthMonitor.stop();
    }
    await new Promise<void>((resolve) => {
      this.client.close();
      resolve();
    });
  }

  isLeader(): boolean {
    return this._isLeader;
  }

  private connect(): Promise<void> {
    const connectionString = this.config.getOrThrow<string>(
      'ZK_CONNECTION_STRING',
    );

    return new Promise((resolve) => {
      this.client = zookeeper.createClient(connectionString, {
        sessionTimeout: 15_000,
        retries: 3,
      });

      this.client.once('connected', async () => {
        this.logger.log(`Connected to ZooKeeper: ${connectionString}`);
        await this.ensureElectionPath();
        await this.createCandidateNode();
        await this.runElection();
        resolve();
      });

      this.client.on('disconnected', () => {
        if (!this.destroyed) {
          this.logger.warn(
            'Disconnected from ZooKeeper — will reconnect on session restore',
          );
        }
      });

      this.client.on('expired', async () => {
        this.logger.warn('ZooKeeper session expired — re-electing');
        if (this._isLeader) {
          this._isLeader = false;
          this.healthMonitor.stop();
          this.emit('follower');
        }
        this.myZnodePath = null;

        if (!this.destroyed) {
          await this.connect();
        }
      });

      this.client.connect();
    });
  }

  private ensureElectionPath(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.mkdirp(ELECTION_PATH, (err) => {
        if (
          err &&
          (err as zookeeper.Exception).getCode?.() !==
            zookeeper.Exception.NODE_EXISTS
        ) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  private createCandidateNode(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.create(
        `${ELECTION_PATH}/n_`,
        Buffer.from(process.env['HOSTNAME'] ?? 'unknown'),
        zookeeper.CreateMode.EPHEMERAL_SEQUENTIAL,
        (err, path) => {
          if (err) return reject(err);
          this.myZnodePath = path;
          this.logger.log(`Candidate znode created: ${path}`);
          resolve();
        },
      );
    });
  }

  private async runElection(): Promise<void> {
    if (!this.myZnodePath) return;

    const children = await this.getChildren();
    const sorted = children.filter((c) => c.startsWith('n_')).sort();

    const myName = this.myZnodePath.split('/').pop()!;
    const myIndex = sorted.indexOf(myName);

    if (myIndex === 0) {
      // Smallest sequence number → become leader
      this._isLeader = true;
      this.logger.log(`[LEADER] This node is the leader (${myName})`);
      this.healthMonitor.start();
      this.emit('leader');
      return;
    }

    // Watch the predecessor — not the global smallest — to avoid herd effect.
    // Only this node watches the predecessor; when it disappears, only we get notified.
    const predecessorName = sorted[myIndex - 1];
    const predecessorPath = `${ELECTION_PATH}/${predecessorName}`;
    this.logger.log(`[FOLLOWER] Watching predecessor: ${predecessorName}`);
    this.emit('follower');

    await this.watchPredecessor(predecessorPath);
  }

  private watchPredecessor(predecessorPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.exists(
        predecessorPath,
        // Watcher callback — fires when the node is deleted/created/changed
        (event) => {
          if (this.destroyed) return;
          if (event.getType() === zookeeper.Event.NODE_DELETED) {
            this.logger.log(
              `Predecessor deleted (${predecessorPath}) — re-running election`,
            );
            if (this._isLeader) {
              // Shouldn't happen, but guard anyway
              this.healthMonitor.stop();
              this._isLeader = false;
            }
            this.runElection().catch((err) =>
              this.logger.error(
                'Election error after predecessor deleted',
                err,
              ),
            );
          }
        },
        (err, stat) => {
          if (err) return reject(err);
          if (!stat) {
            // Predecessor already gone — re-run immediately
            this.runElection().catch(reject);
          }
          resolve();
        },
      );
    });
  }

  private getChildren(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.client.getChildren(ELECTION_PATH, (err, children) => {
        if (err) return reject(err);
        resolve(children);
      });
    });
  }
}
