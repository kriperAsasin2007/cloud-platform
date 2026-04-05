import {
  Injectable,
  Inject,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import {
  Kafka,
  Admin,
  Producer,
  Consumer,
  Partitioners,
  RecordMetadata,
  Message,
} from 'kafkajs';
import { KafkaModuleOptions, KAFKA_MODULE_OPTIONS } from './kafka.config';

export interface PublishOptions {
  topic: string;
  messages: Array<{
    key?: string;
    value: unknown;
    headers?: Record<string, string>;
  }>;
}

const DEFAULT_TOPIC_CONFIG = {
  numPartitions: 3,
  replicationFactor: 1,
};

@Injectable()
export class KafkaService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(KafkaService.name);
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly consumers: Consumer[] = [];
  private admin: Admin | null = null;

  constructor(
    @Inject(KAFKA_MODULE_OPTIONS) private readonly options: KafkaModuleOptions,
  ) {
    const isProd = process.env['NODE_ENV'] === 'production';

    this.kafka = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
      ssl: options.ssl ?? isProd,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sasl: (isProd && options.sasl ? options.sasl : undefined) as any,
      connectionTimeout: 45_000,
      authenticationTimeout: 10_000,
      // Do not cap retries — required for the idempotent producer to preserve EoS guarantees.
      // KafkaJS warns and sets internal retry counters to negative values when retries is finite.
      retry: {
        initialRetryTime: 300,
        maxRetryTime: 30_000,
        factor: 2,
      },
    });

    // Idempotent producer requires acks=-1 (all ISRs) and unlimited retries.
    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
      idempotent: true,
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.producer.connect();
    this.logger.log(`Kafka producer connected [clientId=${this.options.clientId}]`);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.admin) {
      await this.admin.disconnect();
    }
    await this.producer.disconnect();
    await Promise.all(this.consumers.map((c) => c.disconnect()));
    this.logger.log('Kafka disconnected cleanly');
  }

  async publish(opts: PublishOptions): Promise<RecordMetadata[]> {
    const messages: Message[] = opts.messages.map(({ key, value, headers }) => ({
      key: key ?? null,
      value: JSON.stringify(value),
      headers,
    }));
    return this.producer.send({ topic: opts.topic, messages });
  }

  /**
   * Ensures all given topics exist (creates missing ones) then starts a consumer.
   * This avoids the race condition where a consumer subscribes before auto-creation
   * completes and KRaft returns "This server does not host this topic-partition".
   */
  async createConsumer(
    topics: string[],
    handler: (topic: string, payload: unknown) => Promise<void>,
    groupIdSuffix?: string,
  ): Promise<Consumer> {
    await this.ensureTopics(topics);

    const groupId = groupIdSuffix
      ? `${this.options.groupId}-${groupIdSuffix}`
      : this.options.groupId;

    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();

    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const value = message.value
            ? JSON.parse(message.value.toString())
            : null;
          await handler(topic, value);
        } catch (err) {
          this.logger.error(`Failed to handle message on topic "${topic}"`, err);
        }
      },
    });

    this.consumers.push(consumer);
    return consumer;
  }

  /**
   * Creates topics that don't already exist.
   * Safe to call concurrently — uses a single shared admin client and ignores
   * "topic already exists" errors.
   */
  async ensureTopics(topics: string[]): Promise<void> {
    if (!this.admin) {
      this.admin = this.kafka.admin();
      await this.admin.connect();
    }

    const existing = new Set(await this.admin.listTopics());
    const toCreate = topics
      .filter((t) => !existing.has(t))
      .map((topic) => ({ topic, ...DEFAULT_TOPIC_CONFIG }));

    if (toCreate.length === 0) return;

    await this.admin.createTopics({ topics: toCreate, waitForLeaders: true });
    this.logger.log(`Created topics: ${toCreate.map((t) => t.topic).join(', ')}`);
  }
}
