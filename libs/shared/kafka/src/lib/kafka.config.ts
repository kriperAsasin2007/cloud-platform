export const KAFKA_MODULE_OPTIONS = 'KAFKA_MODULE_OPTIONS';

export interface KafkaModuleOptions {
  clientId: string;
  brokers: string[];
  groupId: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
}
