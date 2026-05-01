import { DynamicModule, Module, ModuleMetadata, Type } from '@nestjs/common';
import {
  DEPLOYMENT_CLIENT_OPTIONS,
  DeploymentClientOptions,
} from './deployment-client.config';
import { DeploymentClientService } from './deployment-client.service';

export interface DeploymentClientAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (
    ...args: any[]
  ) => DeploymentClientOptions | Promise<DeploymentClientOptions>;
  inject?: (string | symbol | Type<unknown>)[];
}

@Module({})
export class DeploymentClientModule {
  static forRootAsync(options: DeploymentClientAsyncOptions): DynamicModule {
    return {
      module: DeploymentClientModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: DEPLOYMENT_CLIENT_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        DeploymentClientService,
      ],
      exports: [DeploymentClientService],
    };
  }
}
