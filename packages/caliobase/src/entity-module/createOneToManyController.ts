import {
  Body,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParamOptions,
  PartialType,
} from '@nestjs/swagger';
import { camelCase, sentenceCase } from 'change-case';
import { ValidatorOptions } from 'class-validator';
import { singular } from 'pluralize';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs';
import { RelationMetadataArgs } from 'typeorm/metadata-args/RelationMetadataArgs';

import { cloneMetadata } from '../util/cloneMetadata';

import {
  ApiParams,
  getPrimaryColumns,
  isGenerated,
  toColumnRoutePath,
} from './createEntityController';
import { RenameClass } from './decorators/RenameClass.decorator';
import { RelationPermissionChecker } from './RelationPermissionChecker';

import { ValidatedType } from '.';

export function createOneToManyController<T>(
  OneEntity: Type<T>,
  oneToManyRelationPropertyName: string,
  options: { validatorOptions: ValidatorOptions }
): { controller: Type<any>; manyEntity: Type<any> } {
  const oneToManyRelation = findRelationMetadataArgs(
    OneEntity,
    oneToManyRelationPropertyName
  );

  const ManyEntity = getRelatedTypeFromRelationMetadataArgs(oneToManyRelation);

  const manyToOneRelation = getInverseRelation(oneToManyRelation, ManyEntity);

  // get the columns of the many side that are references to the one side
  const manyToOneReferencingColumns = getPrimaryColumns(OneEntity).map((col) =>
    relationColumnPropertyName(manyToOneRelation, col)
  );

  const oneSidePathParams = toColumnRoutePath(manyToOneReferencingColumns);

  const oneSideColumnParams: ApiParamOptions[] =
    manyToOneReferencingColumns.map((col) => ({ name: col, required: true }));

  // when creating, primary non-generated columns should be in url
  const manyEntityPrimaryNonGeneratedColumns = getPrimaryColumns(ManyEntity)
    .filter(
      (col) =>
        !manyToOneReferencingColumns.includes(col.propertyName) &&
        !isGenerated(col)
    )
    .map((col) => col.propertyName);

  const manyEntityPrimaryNonGeneratedPathParams = toColumnRoutePath(
    manyEntityPrimaryNonGeneratedColumns
  );

  // when updating/deleting/finding, all primary columns should be in url
  const manyEntityPrimaryColumns = getPrimaryColumns(ManyEntity)
    .filter((col) => !manyToOneReferencingColumns.includes(col.propertyName))
    .map((col) => col.propertyName);

  const manyEntityPrimaryPathParams = toColumnRoutePath(
    manyEntityPrimaryColumns
  );

  const manySideColumnParams: ApiParamOptions[] = manyEntityPrimaryColumns.map(
    (col) => ({ name: col, required: true })
  );

  const bothSideColumnParams = [
    ...oneSideColumnParams,
    ...manySideColumnParams,
  ];

  const relationEntityName = `${OneEntity.name}${ManyEntity.name}`;

  @RenameClass(relationEntityName)
  class CreateEntityRelationParams extends ValidatedType(ManyEntity, {
    include: [
      ...manyToOneReferencingColumns,
      ...manyEntityPrimaryNonGeneratedColumns,
    ],
  }) {}

  @RenameClass(relationEntityName)
  class UpdateEntityRelationParams extends ValidatedType(ManyEntity, {
    include: [...manyToOneReferencingColumns, ...manyEntityPrimaryColumns],
  }) {}

  @RenameClass(relationEntityName)
  class CreateEntityRelationDto extends ValidatedType(ManyEntity, {
    exclude: [
      ...manyToOneReferencingColumns,
      ...manyEntityPrimaryNonGeneratedColumns,
    ],
  }) {}

  @RenameClass(relationEntityName)
  class UpdateEntityRelationDto extends PartialType(CreateEntityRelationDto) {}

  @RenameClass(relationEntityName)
  @ApiBearerAuth()
  class EntityRelationController {
    relationPermissionChecker = new RelationPermissionChecker(
      this.dataSource,
      ManyEntity
    );

    constructor(private dataSource: DataSource) {}

    @Post(
      `${oneSidePathParams}/${oneToManyRelationPropertyName}/${manyEntityPrimaryNonGeneratedPathParams}`
    )
    @ApiCreatedResponse({
      type: ManyEntity,
    })
    @ApiParams(bothSideColumnParams)
    [toMethodName('create', oneToManyRelationPropertyName)](
      @Body(
        new ValidationPipe({
          expectedType: CreateEntityRelationDto,
          ...options.validatorOptions,
        })
      )
      body: CreateEntityRelationDto,
      @Param(new ValidationPipe({ expectedType: CreateEntityRelationParams }))
      params: CreateEntityRelationParams,
      @Request() { user }: Express.Request
    ) {
      return this.dataSource.transaction(async (entityManager) => {
        await this.relationPermissionChecker.checkPermissions(
          'write',
          { ...params, ...body },
          user
        );
        return await entityManager.save(
          entityManager.create(ManyEntity, {
            ...params,
            ...body,
          })
        );
      });
    }

    @Get(
      `${oneSidePathParams}/${oneToManyRelationPropertyName}/${manyEntityPrimaryPathParams}`
    )
    @ApiOkResponse({
      type: ManyEntity,
    })
    @ApiParams(bothSideColumnParams)
    [toMethodName('get', oneToManyRelationPropertyName)](
      @Param(new ValidationPipe({ expectedType: UpdateEntityRelationParams }))
      params: UpdateEntityRelationParams,
      @Request() { user }: Express.Request
    ) {
      return this.dataSource.transaction(async (entityManager) => {
        await this.relationPermissionChecker.checkPermissions(
          'read',
          { ...params },
          user
        );
        return await entityManager.findOne(ManyEntity, params);
      });
    }

    @Patch(
      `${oneSidePathParams}/${oneToManyRelationPropertyName}/${manyEntityPrimaryPathParams}`
    )
    @ApiOkResponse({
      type: ManyEntity,
    })
    @ApiParams(bothSideColumnParams)
    [toMethodName('update', oneToManyRelationPropertyName)](
      @Body(
        new ValidationPipe({
          expectedType: UpdateEntityRelationDto,
          ...options.validatorOptions,
        })
      )
      body: UpdateEntityRelationDto,
      @Param(new ValidationPipe({ expectedType: UpdateEntityRelationParams }))
      params: UpdateEntityRelationParams,
      @Request() { user }: Express.Request
    ) {
      return this.dataSource.transaction(async (entityManager) => {
        await this.relationPermissionChecker.checkPermissions(
          'write',
          { ...params, ...body },
          user
        );
        return await entityManager.update(ManyEntity, params, body);
      });
    }

    @Delete(
      `${oneSidePathParams}/${oneToManyRelationPropertyName}/${manyEntityPrimaryPathParams}`
    )
    @ApiOkResponse({
      type: ManyEntity,
    })
    @ApiParams(bothSideColumnParams)
    [toMethodName('remove', oneToManyRelationPropertyName)](
      @Param(new ValidationPipe({ expectedType: UpdateEntityRelationParams }))
      params: UpdateEntityRelationParams,
      @Request() { user }: Express.Request
    ) {
      return this.dataSource.transaction(async (entityManager) => {
        await this.relationPermissionChecker.checkPermissions(
          'write',
          { ...params },
          user
        );
        return await entityManager.remove(ManyEntity, params);
      });
    }
  }

  cloneMetadata(OneEntity, EntityRelationController);

  return {
    controller: EntityRelationController,
    manyEntity: ManyEntity,
  };
}

function getRelatedTypeFromRelationMetadataArgs(
  oneToManyRelation: RelationMetadataArgs
) {
  const ManyEntity =
    oneToManyRelation.type instanceof Function &&
    (oneToManyRelation.type as () => any)();

  if (!(ManyEntity instanceof Function)) {
    throw new TypeError(`could not get type on 'many' side of one to many`);
  }
  return ManyEntity;
}

function findRelationMetadataArgs<T>(OneEntity: Type<T>, propertyName: string) {
  const oneToManyRelation = getMetadataArgsStorage()
    .filterRelations(OneEntity)
    .find((relation) => relation.propertyName === propertyName);

  if (oneToManyRelation == null) {
    throw new TypeError(`could not find relation for property ${propertyName}`);
  }
  return oneToManyRelation;
}

function getInverseRelation(
  oneToManyRelation: RelationMetadataArgs,
  ManyEntity: Type<any>
) {
  const manyEntityPropertyMap = createShallowRelationPropertyMap(ManyEntity);
  const inverseRelation: RelationMetadataArgs =
    typeof oneToManyRelation.inverseSideProperty === 'string'
      ? manyEntityPropertyMap[oneToManyRelation.inverseSideProperty]
      : oneToManyRelation.inverseSideProperty?.(manyEntityPropertyMap);
  return inverseRelation;
}

export function relationColumnPropertyName(
  inverseRelation: RelationMetadataArgs | string,
  col: ColumnMetadataArgs
): string {
  const relationPropertyName =
    typeof inverseRelation === 'string'
      ? inverseRelation
      : inverseRelation.propertyName;
  return camelCase(`${relationPropertyName} ${col.propertyName}`);
}

function createShallowRelationPropertyMap(ManyEntity: any) {
  return getMetadataArgsStorage()
    .filterRelations(ManyEntity)
    .reduce((map, relation) => {
      map[relation.propertyName] = relation;
      return map;
    }, {} as Record<string, RelationMetadataArgs>);
}

function toMethodName(method: string, type: string) {
  return camelCase(`${method} ${singular(sentenceCase(type))}`);
}
