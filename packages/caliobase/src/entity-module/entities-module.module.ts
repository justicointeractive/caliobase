import { Module, Type } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { nonNull } from 'circumspect';
import { ValidatorOptions } from 'class-validator';
import { defaultValidatorOptions } from '../defaultValidatorOptions';
import { createEntityModule } from './createEntityModule';

export type CaliobaseEntitiesModuleOptions = {
  controllerEntities: Type<unknown>[];
  otherEntities: Type<unknown>[];
  validatorOptions?: ValidatorOptions;
  profileEntities: {
    OrganizationProfile: Type<unknown> | null;
    UserProfile: Type<unknown> | null;
  };
};

@Module({})
export class CaliobaseEntitiesModule {
  static async forRootAsync({
    controllerEntities,
    otherEntities,
    validatorOptions,
    profileEntities,
  }: CaliobaseEntitiesModuleOptions) {
    return {
      module: CaliobaseEntitiesModule,
      imports: [
        TypeOrmModule.forFeature([...otherEntities]),
        ...[
          ...controllerEntities,
          profileEntities.OrganizationProfile,
          profileEntities.UserProfile,
        ]
          .filter(nonNull)
          .map((entity) =>
            createEntityModule(entity, {
              ...defaultValidatorOptions,
              ...validatorOptions,
            })
          ),
      ],
    };
  }
}
