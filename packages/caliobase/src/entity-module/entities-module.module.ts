import { Module, Type } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValidatorOptions } from 'class-validator';
import { defaultValidatorOptions } from '../defaultValidatorOptions';
import { createEntityModule } from './createEntityModule';

export type CaliobaseEntitiesModuleOptions = {
  controllerEntities: Type<unknown>[];
  otherEntities: Type<unknown>[];
  validatorOptions?: ValidatorOptions;
};

@Module({})
export class CaliobaseEntitiesModule {
  static async forRootAsync({
    controllerEntities,
    otherEntities,
    validatorOptions,
  }: CaliobaseEntitiesModuleOptions) {
    return {
      module: CaliobaseEntitiesModule,
      imports: [
        TypeOrmModule.forFeature([...otherEntities]),
        ...controllerEntities.map((entity) =>
          createEntityModule(entity, {
            ...defaultValidatorOptions,
            ...validatorOptions,
          })
        ),
      ],
    };
  }
}
