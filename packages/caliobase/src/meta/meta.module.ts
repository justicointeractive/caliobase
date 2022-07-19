import { DynamicModule, Module } from '@nestjs/common';
import { CaliobaseAuthProfileEntities } from '../auth/auth.module';
import {
  AbstractOrganizationProfile,
  AbstractUserProfile,
} from '../auth/profiles.service';
import { createMetaController } from './meta.controller';

@Module({})
export class CaliobaseMetaModule {
  static async forRootAsync<
    TUser extends AbstractUserProfile,
    TOrganization extends AbstractOrganizationProfile
  >({
    profileEntities,
  }: {
    profileEntities: CaliobaseAuthProfileEntities<TUser, TOrganization>;
  }): Promise<DynamicModule> {
    return {
      module: CaliobaseMetaModule,
      controllers: [createMetaController({ profileEntities })],
    };
  }
}
