import { DynamicModule, Module } from '@nestjs/common';
import {
  CaliobaseAuthModule,
  CaliobaseAuthModuleOptions,
} from './auth/auth.module';
import {
  AbstractOrganizationProfile,
  AbstractUserProfile,
} from './auth/profiles.service';
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

export type CaliobaseModuleOptions<
  TUser extends AbstractUserProfile,
  TOrganization extends AbstractOrganizationProfile
> = CaliobaseEntitiesModuleOptions &
  CaliobaseObjectStorageModuleOptions &
  CaliobaseAuthModuleOptions<TUser, TOrganization> &
  CaliobaseConfigModuleOptions;

@Module({})
export class CaliobaseModule {
  static async forRootAsync<
    TUser extends AbstractUserProfile,
    TOrganization extends AbstractOrganizationProfile
  >({
    objectStorageProvider,
    socialProviders,
    profileEntities,
    controllerEntities,
    otherEntities,
    validatorOptions,
    baseUrl,
    emailTransport,
    guestRole,
  }: CaliobaseModuleOptions<TUser, TOrganization>): Promise<DynamicModule> {
    return {
      module: CaliobaseModule,
      imports: [
        CaliobaseConfigModule.forRootAsync({
          baseUrl,
          emailTransport,
          guestRole,
        }),
        CaliobaseAuthModule.forRootAsync({ socialProviders, profileEntities }),
        CaliobaseObjectStorageModule.forRootAsync({ objectStorageProvider }),
        CaliobaseMetaModule.forRootAsync({ profileEntities }),
        CaliobaseEntitiesModule.forRootAsync({
          controllerEntities,
          otherEntities,
          validatorOptions,
        }),
      ],
    };
  }
}
