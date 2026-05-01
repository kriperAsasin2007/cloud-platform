import { DynamicModule, Module, ModuleMetadata, Type } from '@nestjs/common';
import { MINIO_OPTIONS, MinioOptions } from './minio.config';
import { MinioService } from './minio.service';

export interface MinioAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => MinioOptions | Promise<MinioOptions>;
  inject?: (string | symbol | Type<unknown>)[];
}

@Module({})
export class MinioModule {
  static forRootAsync(options: MinioAsyncOptions): DynamicModule {
    return {
      module: MinioModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: MINIO_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        MinioService,
      ],
      exports: [MinioService],
    };
  }
}
