import {
  Delete,
  Param,
  Post,
  Request,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParamOptions,
} from '@nestjs/swagger';
import { camelCase, sentenceCase } from 'change-case';
import { ValidatorOptions } from 'class-validator';
import { fromPairs } from 'lodash';
import { singular } from 'pluralize';
import { DataSource, EntityManager } from 'typeorm';
import { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs';
import { RelationMetadataArgs } from 'typeorm/metadata-args/RelationMetadataArgs';
import { ValidatedType } from '.';
import { cloneMetadata } from '../internal-utils/cloneMetadata';
import { assertEqual } from '../lib/assert';
import {
  getPrimaryColumns,
  getTable,
  toColumnRoutePath,
} from '../lib/columnUtils';
import { ApiParams } from './createEntityController';
import {
  getNamedEntityClassName,
  RenameClass,
} from './decorators/RenameClass.decorator';
import { findRelationMetadataArgs } from './findRelationMetadataArgs';
import { IManyToManyRelationController } from './IManyToManyRelationController';
import { RelationPermissionChecker } from './RelationPermissionChecker';
import { RequestUser } from './RequestUser';

export function createManyToManyController<T>(
  ReferenceEntity: Type<T>,
  referenceToOtherRelationPropertyName: string,
  options: { validatorOptions: ValidatorOptions }
): { controller: Type<unknown>; manyEntity: Type<unknown> } {
  const manyToManyRelation = findRelationMetadataArgs(
    ReferenceEntity,
    referenceToOtherRelationPropertyName
  );

  assertEqual(manyToManyRelation.relationType, 'many-to-many');

  const OtherEntity =
    getRelatedTypeFromRelationMetadataArgs(manyToManyRelation);

  const referenceEntityPrimaryColumns = getPrimaryColumns(ReferenceEntity).map(
    (col) => ({
      referenceTableColumn: col.propertyName,
      joinTableColumn: camelCase(
        `${getTable(ReferenceEntity)?.name}_${col.propertyName}`
      ),
    })
  );
  const otherEntityPrimaryColumns = getPrimaryColumns(OtherEntity).map(
    (col) => ({
      otherTableColumn: col.propertyName,
      joinTableColumn: camelCase(
        `${getTable(OtherEntity)?.name}_${col.propertyName}`
      ),
    })
  );

  const referenceSidePathParams = toColumnRoutePath(
    referenceEntityPrimaryColumns.map((c) => c.joinTableColumn)
  );

  const otherSidePathParams = toColumnRoutePath(
    otherEntityPrimaryColumns.map((c) => c.joinTableColumn)
  );

  const referenceSideColumnParams: ApiParamOptions[] =
    referenceEntityPrimaryColumns.map((col) => ({
      name: col.joinTableColumn,
      required: true,
    }));

  const otherSideColumnParams: ApiParamOptions[] =
    otherEntityPrimaryColumns.map((col) => ({
      name: col.joinTableColumn,
      required: true,
    }));

  const bothSideColumnParams = [
    ...referenceSideColumnParams,
    ...otherSideColumnParams,
  ];

  const relationEntityName = `${ReferenceEntity.name}${OtherEntity.name}`;

  @RenameClass(relationEntityName)
  class CreateEntityRelationParams extends ValidatedType(
    OtherEntity as Type<Record<string, unknown>>,
    {
      include: [
        ...referenceEntityPrimaryColumns.map((c) => c.joinTableColumn),
        ...otherEntityPrimaryColumns.map((c) => c.joinTableColumn),
      ],
    }
  ) {}

  @RenameClass(relationEntityName)
  @ApiBearerAuth()
  class EntityRelationController
    implements IManyToManyRelationController<unknown>
  {
    relationPermissionChecker = new RelationPermissionChecker(
      this.dataSource,
      OtherEntity
    );
    joinTableName: string;

    constructor(
      private dataSource: DataSource,
      private entityManager: EntityManager
    ) {
      this.joinTableName = dataSource.namingStrategy.joinTableName(
        getTable(ReferenceEntity)!.name!,
        getTable(OtherEntity)!.name!,
        referenceToOtherRelationPropertyName,
        ''
      );
    }

    @Post(
      `${referenceSidePathParams}/${referenceToOtherRelationPropertyName}/${otherSidePathParams}`
    )
    @ApiCreatedResponse({
      type: OtherEntity,
    })
    @ApiParams(bothSideColumnParams)
    @ApiOperation({
      operationId: formatOperationId('create'),
    })
    async create(
      @Param(
        new ValidationPipe({
          expectedType: CreateEntityRelationParams,
          ...options.validatorOptions,
        })
      )
      params: CreateEntityRelationParams,
      @Request() { user }: RequestUser
    ) {
      await this.relationPermissionChecker.checkPermissions(
        'write',
        params,
        user
      );
      await this.dataSource
        .createQueryBuilder(ReferenceEntity, 'ref')
        .relation(referenceToOtherRelationPropertyName)
        .of(
          fromPairs(
            referenceEntityPrimaryColumns.map((col) => [
              col.referenceTableColumn,
              params[col.joinTableColumn],
            ])
          )
        )
        .add(
          fromPairs(
            otherEntityPrimaryColumns.map((col) => [
              col.otherTableColumn,
              params[col.joinTableColumn],
            ])
          )
        );
    }

    @Delete(
      `${referenceSidePathParams}/${referenceToOtherRelationPropertyName}/${otherSidePathParams}`
    )
    @ApiOkResponse({
      type: OtherEntity,
    })
    @ApiParams(bothSideColumnParams)
    @ApiOperation({
      operationId: formatOperationId('remove'),
    })
    async remove(
      @Param(
        new ValidationPipe({
          expectedType: CreateEntityRelationParams,
          ...options.validatorOptions,
        })
      )
      params: CreateEntityRelationParams,
      @Request() { user }: RequestUser
    ) {
      await this.relationPermissionChecker.checkPermissions(
        'write',
        { ...params },
        user
      );

      await this.dataSource
        .createQueryBuilder(ReferenceEntity, 'ref')
        .relation(referenceToOtherRelationPropertyName)
        .of(
          fromPairs(
            referenceEntityPrimaryColumns.map((col) => [
              col.referenceTableColumn,
              params[col.joinTableColumn],
            ])
          )
        )
        .remove(
          fromPairs(
            otherEntityPrimaryColumns.map((col) => [
              col.otherTableColumn,
              params[col.joinTableColumn],
            ])
          )
        );
    }
  }

  cloneMetadata(ReferenceEntity, EntityRelationController);

  function formatOperationId(method: string) {
    const methodKey = camelCase(
      `${method} ${singular(
        sentenceCase(referenceToOtherRelationPropertyName)
      )}`
    );
    const controllerKey = getNamedEntityClassName(
      EntityRelationController,
      'Entity',
      relationEntityName
    );
    return `${controllerKey}_${methodKey}`;
  }

  return {
    controller: EntityRelationController,
    manyEntity: OtherEntity,
  };
}

function getRelatedTypeFromRelationMetadataArgs(
  oneToManyRelation: RelationMetadataArgs
) {
  const ManyEntity =
    oneToManyRelation.type instanceof Function &&
    (oneToManyRelation.type as () => Type<unknown>)();

  if (!(ManyEntity instanceof Function)) {
    throw new TypeError(`could not get type on 'many' side of one to many`);
  }
  return ManyEntity;
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
