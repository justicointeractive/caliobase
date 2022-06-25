import { Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { PartialType } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeepPartial } from 'typeorm';

import { CaliobaseController } from './CaliobaseController';
import { createEntityServiceClass } from './createEntityServiceClass';
import { RenameClass } from './decorators/RenameClass.decorator';
import { ICaliobaseServiceType } from './ICaliobaseService';
import { ValidatedType } from './ValidatedType';

import { buildFindManyQueryParamClass, ToFindOptions } from '.';

export function CaliobaseEntityModule<TEntity>(
  entityType: Type<TEntity>,
  validatorOptions: ValidationPipeOptions
): ICaliobaseEntityModule<TEntity> {
  const FindManyParams = buildFindManyQueryParamClass(entityType);

  @RenameClass(entityType)
  class CreateEntityDto extends (ValidatedType(entityType) as any) {}

  @RenameClass(entityType)
  class UpdateEntityDto extends (PartialType(CreateEntityDto) as any) {}

  const EntityService = createEntityServiceClass(
    entityType,
    FindManyParams,
    CreateEntityDto as Type<DeepPartial<TEntity>>,
    UpdateEntityDto as Type<DeepPartial<TEntity>>
  );

  const controllers = (() => {
    if (Reflect.getMetadata(PATH_METADATA, entityType)) {
      const controllers = CaliobaseController(
        EntityService,
        FindManyParams,
        validatorOptions
      );

      return controllers;
    }
    return [];
  })();

  @Module({
    imports: [TypeOrmModule.forFeature([entityType])],
    controllers: [...controllers],
    providers: [EntityService],
  })
  @RenameClass(entityType)
  class EntityModule {
    static FindManyParams = FindManyParams;
    static CreateEntityDto = CreateEntityDto as Type<DeepPartial<TEntity>>;
    static UpdateEntityDto = UpdateEntityDto as Type<DeepPartial<TEntity>>;
    static EntityService = EntityService;
    static EntityControllers = controllers;
  }

  return EntityModule;
}

export interface ICaliobaseEntityModule<TEntity> {
  FindManyParams: Type<ToFindOptions<TEntity>>;
  CreateEntityDto: Type<DeepPartial<TEntity>>;
  UpdateEntityDto: Type<DeepPartial<TEntity>>;
  EntityService: ICaliobaseServiceType<
    TEntity,
    DeepPartial<TEntity>,
    DeepPartial<TEntity>
  >;
  EntityController?: Type<any>;

  // eslint-disable-next-line @typescript-eslint/ban-types
  new (): {};
}
