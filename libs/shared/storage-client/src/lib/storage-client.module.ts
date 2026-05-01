import { DynamicModule, Module, ModuleMetadata, Type } from '@nestjs/common';
import {
  STORAGE_CLIENT_OPTIONS,
  StorageClientOptions,
} from './storage-client.config';
import { StorageClientService } from './storage-client.service';

export interface StorageClientAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => StorageClientOptions | Promise<StorageClientOptions>;
  inject?: (string | symbol | Type<unknown>)[];
}

@Module({})
export class StorageClientModule {
  static forRootAsync(options: StorageClientAsyncOptions): DynamicModule {
    return {
      module: StorageClientModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: STORAGE_CLIENT_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        StorageClientService,
      ],
      exports: [StorageClientService],
    };
  }
}
