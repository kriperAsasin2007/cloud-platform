import { DynamicModule, Module, ModuleMetadata, Type } from '@nestjs/common';
import {
  METRICS_CLIENT_OPTIONS,
  MetricsClientOptions,
} from './metrics-client.config';
import { MetricsClientService } from './metrics-client.service';

export interface MetricsClientAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (
    ...args: any[]
  ) => MetricsClientOptions | Promise<MetricsClientOptions>;
  inject?: (string | symbol | Type<unknown>)[];
}

@Module({})
export class MetricsClientModule {
  static forRootAsync(options: MetricsClientAsyncOptions): DynamicModule {
    return {
      module: MetricsClientModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: METRICS_CLIENT_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        MetricsClientService,
      ],
      exports: [MetricsClientService],
    };
  }
}
