import { DynamicModule, Module } from '@nestjs/common';
import {
  CaliobaseAuthModule,
  CaliobaseAuthModuleOptions,
} from './auth/auth.module';
import {
  CaliobaseConfigModule,
  CaliobaseConfigModuleOptions,
} from './config/config.module';
import {
  CaliobaseEntitiesModule,
  CaliobaseEntitiesModuleOptions,
} from './entity-module/entities-module.module';
import { CaliobaseMetaModule } from './meta/meta.module';
import {
  CaliobaseObjectStorageModule,
  CaliobaseObjectStorageModuleOptions,
} from './object-storage/object-storage.module';

export type CaliobaseModuleOptions = CaliobaseEntitiesModuleOptions &
  CaliobaseObjectStorageModuleOptions &
  CaliobaseAuthModuleOptions &
  CaliobaseConfigModuleOptions;

@Module({})
export class CaliobaseModule {
  static async forRootAsync({
    objectStorageProvider,
    socialProviders,
    controllerEntities,
    otherEntities,
    validatorOptions,
    baseUrl,
    emailTransport,
    guestRole,
  }: CaliobaseModuleOptions): Promise<DynamicModule> {
    return {
      module: CaliobaseModule,
      imports: [
        CaliobaseConfigModule.forRootAsync({
          baseUrl,
          emailTransport,
          guestRole,
        }),
        CaliobaseAuthModule.forRootAsync({ socialProviders }),
        CaliobaseObjectStorageModule.forRootAsync({ objectStorageProvider }),
        CaliobaseMetaModule,
        CaliobaseEntitiesModule.forRootAsync({
          controllerEntities,
          otherEntities,
          validatorOptions,
        }),
      ],
    };
  }
}
