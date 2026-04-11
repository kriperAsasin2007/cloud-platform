import { DynamicModule, Module, ModuleMetadata, Type } from '@nestjs/common';
import { KafkaModuleOptions, KAFKA_MODULE_OPTIONS } from './kafka.config';
import { KafkaService } from './kafka.service';

export interface KafkaModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => KafkaModuleOptions | Promise<KafkaModuleOptions>;
  inject?: (string | symbol | Type<unknown>)[];
}

@Module({})
export class KafkaModule {
  static forRoot(options: KafkaModuleOptions): DynamicModule {
    return {
      module: KafkaModule,
      global: true,
      providers: [
        { provide: KAFKA_MODULE_OPTIONS, useValue: options },
        KafkaService,
      ],
      exports: [KafkaService],
    };
  }

  static forRootAsync(options: KafkaModuleAsyncOptions): DynamicModule {
    return {
      module: KafkaModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: KAFKA_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        KafkaService,
      ],
      exports: [KafkaService],
    };
  }
}
