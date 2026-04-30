import { DynamicModule, Module, ModuleMetadata, Type } from '@nestjs/common';
import { USERS_CLIENT_OPTIONS, UsersClientOptions } from './users-client.config';
import { UsersClientService } from './users-client.service';

export interface UsersClientAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory: (...args: any[]) => UsersClientOptions | Promise<UsersClientOptions>;
  inject?: (string | symbol | Type<unknown>)[];
}

@Module({})
export class UsersClientModule {
  static forRootAsync(options: UsersClientAsyncOptions): DynamicModule {
    return {
      module: UsersClientModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        { provide: USERS_CLIENT_OPTIONS, useFactory: options.useFactory, inject: options.inject ?? [] },
        UsersClientService,
      ],
      exports: [UsersClientService],
    };
  }
}
