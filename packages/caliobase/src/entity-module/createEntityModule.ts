import { Module, Type, ValidationPipeOptions } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { PartialType } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeepPartial } from 'typeorm';
import {
  CaliobaseEntity,
  createFindManyQueryParamClass,
  ToFindOptions,
} from '.';
import { EntityOwner, getOwnerProperty } from '../auth';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
import { defaultValidatorOptions } from '../defaultValidatorOptions';
import { createEntityController } from './createEntityController';
import { createEntityServiceClass } from './createEntityServiceClass';
import { RenameClass } from './decorators/RenameClass.decorator';
import { ICaliobaseServiceType } from './ICaliobaseService';
import { ValidatedType } from './ValidatedType';

export function createEntityModule<TEntity>(
  entityType: Type<TEntity>,
  validatorOptions: ValidationPipeOptions = defaultValidatorOptions
): ICaliobaseEntityModule<TEntity> {
  const FindManyParams = createFindManyQueryParamClass(entityType);

  @RenameClass(entityType)
  class CreateEntityDto extends (ValidatedType(entityType) as Type<object>) {}

  @RenameClass(entityType)
  class UpdateEntityDto extends PartialType(CreateEntityDto) {}

  const EntityService = createEntityServiceClass(
    entityType,
    FindManyParams,
    CreateEntityDto as Type<DeepPartial<TEntity>>,
    UpdateEntityDto as Type<DeepPartial<TEntity>>
  );

  const { controllers, otherEntities } = (() => {
    if (Reflect.getMetadata(PATH_METADATA, entityType)) {
      const controllers = createEntityController(
        EntityService,
        FindManyParams,
        validatorOptions
      );

      return controllers;
    }
    return { controllers: [], otherEntities: [] };
  })();

  const aclEntity = getAclEntity(entityType);
  const ownerRelation = getOwnerProperty(entityType);

  if (
    aclEntity == null &&
    ownerRelation == null &&
    CaliobaseEntity.get(entityType)?.organizationOwner !== false
  ) {
    EntityOwner()(entityType.prototype, 'organization');
  }

  @Module({
    imports: [
      TypeOrmModule.forFeature([
        entityType,
        ...otherEntities,
        ...(aclEntity ? [aclEntity] : []),
      ]),
    ],
    controllers: [...controllers],
    providers: [EntityService],
    exports: [EntityService],
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
  EntityControllers?: Type<unknown>[];

  // eslint-disable-next-line @typescript-eslint/ban-types
  new (): {};
}
