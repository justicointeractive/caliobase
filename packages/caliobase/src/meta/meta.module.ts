import { DynamicModule, Module } from '@nestjs/common';
import { CaliobaseAuthProfileEntities } from '../auth/auth.module';
import { createMetaController } from './meta.controller';

@Module({})
export class CaliobaseMetaModule {
  async forRootAsync({
    profileEntities,
  }: {
    profileEntities: CaliobaseAuthProfileEntities;
  }): Promise<DynamicModule> {
    return {
      module: CaliobaseMetaModule,
      controllers: [createMetaController({ profileEntities })],
    };
  }
}
