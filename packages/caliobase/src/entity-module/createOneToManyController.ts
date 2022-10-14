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
  ApiOperation,
  ApiParamOptions,
  PartialType,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { camelCase, sentenceCase } from 'change-case';
import { ValidatorOptions } from 'class-validator';
import { singular } from 'pluralize';
import {
  DataSource,
  FindOptionsWhere,
  getMetadataArgsStorage,
  Repository,
} from 'typeorm';
import { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs';
import { RelationMetadataArgs } from 'typeorm/metadata-args/RelationMetadataArgs';
import { CaliobaseEntity, ValidatedType } from '.';
import { Organization } from '../auth/entities/organization.entity';
import { CaliobaseRequestUser } from '../auth/jwt.strategy';
import { cloneMetadata } from '../internal-utils/cloneMetadata';
import { assertEqual } from '../lib/assert';
import {
  getPrimaryColumns,
  isGenerated,
  toColumnRoutePath,
} from '../lib/columnUtils';
import {
  ApiOkPaginatedResponse,
  PaginationItemResponse,
  PaginationItemsResponse,
} from '../lib/envelopes';
import { ApiParams } from './createEntityController';
import {
  getNamedEntityClassName,
  RenameClass,
} from './decorators/RenameClass.decorator';
import { findRelationMetadataArgs } from './findRelationMetadataArgs';
import { IOneToManyRelationController } from './IOneToManyRelationController';
import { RelationPermissionChecker } from './RelationPermissionChecker';
import { RequestUser } from './RequestUser';

export function createOneToManyController<TOneEntity>(
  OneEntity: Type<TOneEntity>,
  oneToManyRelationPropertyName: string,
  options: { validatorOptions: ValidatorOptions }
): { controller: Type<unknown>; manyEntity: Type<unknown> } {
  const oneToManyRelation = findRelationMetadataArgs(
    OneEntity,
    oneToManyRelationPropertyName
  );

  assertEqual(oneToManyRelation.relationType, 'one-to-many');

  const ManyEntity = getRelatedTypeFromRelationMetadataArgs(oneToManyRelation);

  const manyEntityOptions = CaliobaseEntity.get<typeof ManyEntity>(ManyEntity);
  const manyEntityHasOrganizationOwner =
    manyEntityOptions?.organizationOwner !== false;

  function getManyOwnerIdMixin(user?: CaliobaseRequestUser): {
    organization: Pick<Organization, 'id'> | null;
  } {
    if (!manyEntityHasOrganizationOwner) {
      return { organization: null };
    }

    const organizationId = user?.organization?.id;

    if (organizationId == null) {
      throw new Error(
        'supplied access token does not provide an appropriate owner id'
      );
    }

    return { organization: { id: organizationId } };
  }

  const manyToOneRelation = getInverseRelation(oneToManyRelation, ManyEntity);

  // get the columns of the many side that are references to the one side
  const manyToOneReferencingColumns = manyToOneRelation
    ? getPrimaryColumns(OneEntity).map((col) =>
        relationColumnPropertyName(manyToOneRelation, col)
      )
    : [];

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
  class CreateEntityRelationParams extends ValidatedType(
    ManyEntity as Type<Record<string, unknown>>,
    {
      include: [
        ...manyToOneReferencingColumns,
        ...manyEntityPrimaryNonGeneratedColumns,
      ],
    }
  ) {}

  @RenameClass(relationEntityName)
  class UpdateEntityRelationParams extends ValidatedType(
    ManyEntity as Type<Record<string, unknown>>,
    {
      include: [...manyToOneReferencingColumns, ...manyEntityPrimaryColumns],
    }
  ) {}

  @RenameClass(relationEntityName)
  class CreateEntityRelationDto extends ValidatedType(
    ManyEntity as Type<Record<string, unknown>>,
    {
      exclude: [
        ...manyToOneReferencingColumns,
        ...manyEntityPrimaryNonGeneratedColumns,
      ],
    }
  ) {}

  @RenameClass(relationEntityName)
  class UpdateEntityRelationDto extends PartialType(CreateEntityRelationDto) {}

  @RenameClass(relationEntityName)
  @ApiBearerAuth()
  class EntityRelationController
    implements IOneToManyRelationController<typeof ManyEntity>
  {
    relationPermissionChecker = new RelationPermissionChecker(
      this.dataSource,
      ManyEntity
    );

    constructor(
      private dataSource: DataSource,
      @InjectRepository(ManyEntity)
      private manyRepo: Repository<typeof ManyEntity>
    ) {}

    @Post(
      `${oneSidePathParams}/${oneToManyRelationPropertyName}/${manyEntityPrimaryNonGeneratedPathParams}`
    )
    @ApiCreatedResponse({
      type: ManyEntity,
    })
    @ApiParams(bothSideColumnParams)
    @ApiOperation({
      operationId: formatOperationId('create'),
    })
    async create(
      @Body(
        new ValidationPipe({
          expectedType: CreateEntityRelationDto,
          ...options.validatorOptions,
        })
      )
      body: CreateEntityRelationDto,
      @Param(new ValidationPipe({ expectedType: CreateEntityRelationParams }))
      params: CreateEntityRelationParams,
      @Request() { user }: RequestUser
    ) {
      await this.relationPermissionChecker.checkPermissions(
        'write',
        { ...params, ...body },
        user
      );
      return new PaginationItemResponse(
        await this.manyRepo.save(
          this.manyRepo.create({
            ...params,
            ...body,
            // eslint-disable-next-line @typescript-eslint/ban-types
            ...(getManyOwnerIdMixin(user) as {}),
          })
        )
      );
    }

    @Get(
      `${oneSidePathParams}/${oneToManyRelationPropertyName}/${manyEntityPrimaryNonGeneratedPathParams}`
    )
    @ApiOkPaginatedResponse({
      type: ManyEntity,
    })
    @ApiParams(bothSideColumnParams)
    @ApiOperation({
      operationId: formatOperationId('findAll'),
    })
    async findAll(
      @Param(new ValidationPipe({ expectedType: CreateEntityRelationParams }))
      params: CreateEntityRelationParams,
      @Request() { user }: RequestUser
    ) {
      await this.relationPermissionChecker.checkPermissions(
        'read',
        { ...params },
        user
      );
      return new PaginationItemsResponse(
        await this.manyRepo.findBy(params as FindOptionsWhere<unknown>)
      );
    }

    @Get(
      `${oneSidePathParams}/${oneToManyRelationPropertyName}/${manyEntityPrimaryPathParams}`
    )
    @ApiOkResponse({
      type: ManyEntity,
    })
    @ApiParams(bothSideColumnParams)
    @ApiOperation({
      operationId: formatOperationId('findOne'),
    })
    async findOne(
      @Param(new ValidationPipe({ expectedType: UpdateEntityRelationParams }))
      params: UpdateEntityRelationParams,
      @Request() { user }: RequestUser
    ) {
      await this.relationPermissionChecker.checkPermissions(
        'read',
        { ...params },
        user
      );
      return new PaginationItemResponse(
        await this.manyRepo.findOneByOrFail(params as FindOptionsWhere<unknown>)
      );
    }

    @Patch(
      `${oneSidePathParams}/${oneToManyRelationPropertyName}/${manyEntityPrimaryPathParams}`
    )
    @ApiOkResponse({
      type: ManyEntity,
    })
    @ApiParams(bothSideColumnParams)
    @ApiOperation({
      operationId: formatOperationId('update'),
    })
    async update(
      @Body(
        new ValidationPipe({
          expectedType: UpdateEntityRelationDto,
          ...options.validatorOptions,
        })
      )
      body: UpdateEntityRelationDto,
      @Param(new ValidationPipe({ expectedType: UpdateEntityRelationParams }))
      params: UpdateEntityRelationParams,
      @Request() { user }: RequestUser
    ) {
      await this.relationPermissionChecker.checkPermissions(
        'write',
        { ...params, ...body },
        user
      );
      const found = await this.manyRepo.findBy(
        params as FindOptionsWhere<unknown>
      );
      for (const item of found) {
        Object.assign(item, body);
        await this.manyRepo.save(item);
      }
      return new PaginationItemsResponse(found);
    }

    @Delete(
      `${oneSidePathParams}/${oneToManyRelationPropertyName}/${manyEntityPrimaryPathParams}`
    )
    @ApiOkResponse({
      type: ManyEntity,
    })
    @ApiParams(bothSideColumnParams)
    @ApiOperation({
      operationId: formatOperationId('remove'),
    })
    async remove(
      @Param(new ValidationPipe({ expectedType: UpdateEntityRelationParams }))
      params: UpdateEntityRelationParams,
      @Request() { user }: RequestUser
    ) {
      await this.relationPermissionChecker.checkPermissions(
        'write',
        { ...params },
        user
      );
      const found = await this.manyRepo.findBy(
        params as FindOptionsWhere<unknown>
      );
      for (const item of found) {
        await this.manyRepo.remove(item);
      }
      return new PaginationItemsResponse(found);
    }
  }

  cloneMetadata(OneEntity, EntityRelationController);

  function formatOperationId(method: string) {
    const methodKey = camelCase(
      `${method} ${singular(sentenceCase(oneToManyRelationPropertyName))}`
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
    manyEntity: ManyEntity,
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

function getInverseRelation(
  oneToManyRelation: RelationMetadataArgs,
  ManyEntity: Type<unknown>
) {
  const manyEntityPropertyMap = createShallowRelationPropertyMap(ManyEntity);
  const inverseRelation: RelationMetadataArgs | undefined =
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

function createShallowRelationPropertyMap(ManyEntity: Type<unknown>) {
  return getMetadataArgsStorage()
    .filterRelations(ManyEntity)
    .reduce((map, relation) => {
      map[relation.propertyName] = relation;
      return map;
    }, {} as Record<string, RelationMetadataArgs>);
}
