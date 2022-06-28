import {
  Body,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Type,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiParam,
  ApiParamOptions,
  ApiQuery,
} from '@nestjs/swagger';
import { ValidatorOptions } from 'class-validator';
import { fromPairs } from 'lodash';
import { getMetadataArgsStorage } from 'typeorm';
import { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs';
import { ToFindOptions } from '.';
import { getAclEntity } from '..';
import { CaliobaseJwtPayload } from '../auth/jwt-payload';
import {
  ApiCreatedItemResponse,
  ApiOkItemResponse,
  ApiOkPaginatedResponse,
  ItemEnvelope,
  ItemsEnvelope,
} from '../lib/envelopes';
import { cloneMetadata } from '../util/cloneMetadata';
import { createAclController } from './createAclController';
import { createOneToManyController } from './createOneToManyController';
import { getRelationController } from './decorators';
import { RenameClass } from './decorators/RenameClass.decorator';
import { ICaliobaseController } from './ICaliobaseController';
import { ICaliobaseServiceType } from './ICaliobaseService';

export function createEntityController<TEntity, TCreate, TUpdate>(
  ControllerService: ICaliobaseServiceType<TEntity, TCreate, TUpdate>,
  findManyOptions: Type<ToFindOptions<TEntity>>,
  validatorOptions: ValidatorOptions
): Type<unknown>[] {
  const Entity = ControllerService.Entity;

  function getOwnerIdObject(jwt?: CaliobaseJwtPayload) {
    const id = jwt && jwt.organizationId;
    if (id == null) {
      throw new Error(
        'supplied access token does not provide an appropriate owner id'
      );
    }
    return { id };
  }

  const AclEntity = getAclEntity(ControllerService.Entity);

  const primaryColumns = getPrimaryColumns(ControllerService.Entity);

  const primaryColumnParams: ApiParamOptions[] = primaryColumns.map((col) => ({
    name: col.propertyName,
    required: true,
  }));

  const primaryColumnRoutePath = toColumnRoutePath(primaryColumns);

  const controllers: Type<unknown>[] = [];
  {
    @RenameClass(ControllerService.Entity)
    @ApiBearerAuth()
    @ApiExtraModels(ControllerService.Entity)
    class EntityController implements ICaliobaseController<TEntity> {
      constructor(
        @Inject(ControllerService)
        public readonly service: InstanceType<typeof ControllerService>
      ) {}

      @Post()
      @ApiBody({
        type: ControllerService.CreateDto,
      })
      @ApiCreatedItemResponse({
        type: ControllerService.Entity,
      })
      async create(
        @Body(
          new ValidationPipe({
            expectedType: ControllerService.CreateDto,
            ...validatorOptions,
          })
        )
        createDto: TCreate,
        @Request() { user }: Express.Request
      ) {
        return new ItemEnvelope(
          await this.service.create(createDto, {
            owner: getOwnerIdObject(user),
          })
        );
      }

      @Get()
      @ApiQuery({
        type: findManyOptions,
      })
      @ApiOkPaginatedResponse({
        type: ControllerService.Entity,
      })
      async findAll(
        @Request() { user }: Express.Request,
        @Query(
          new ValidationPipe({
            expectedType: findManyOptions,
            ...validatorOptions,
          })
        )
        listOptions: ToFindOptions<TEntity>
      ) {
        return new ItemsEnvelope(
          await this.service.findAll(listOptions.toFindOptions(), {
            owner: getOwnerIdObject(user),
          })
        );
      }

      @Get(primaryColumnRoutePath)
      @ApiOkItemResponse({
        type: ControllerService.Entity,
      })
      @ApiParams(primaryColumnParams)
      async findOne(
        @Param() params: unknown,
        @Request() { user }: Express.Request
      ) {
        return new ItemEnvelope(
          await this.service.findOne(
            { where: pickColumnProperties(primaryColumns, params) },
            { owner: getOwnerIdObject(user) }
          )
        );
      }

      @Patch(primaryColumnRoutePath)
      @ApiBody({
        type: ControllerService.UpdateDto,
      })
      @ApiParams(primaryColumnParams)
      @ApiOkPaginatedResponse({
        type: ControllerService.Entity,
      })
      async update(
        @Param() params: unknown,
        @Body(
          new ValidationPipe({
            expectedType: ControllerService.UpdateDto,
            ...validatorOptions,
          })
        )
        updateDto: TUpdate,
        @Request() { user }: Express.Request
      ) {
        return new ItemsEnvelope(
          await this.service.update(
            pickColumnProperties(primaryColumns, params),
            updateDto,
            {
              owner: getOwnerIdObject(user),
            }
          )
        );
      }

      @Delete(primaryColumnRoutePath)
      @ApiParams(primaryColumnParams)
      @ApiOkPaginatedResponse({
        type: ControllerService.Entity,
      })
      async remove(
        @Param() params: unknown,
        @Request() { user }: Express.Request
      ) {
        return new ItemsEnvelope(
          await this.service.remove(
            pickColumnProperties(primaryColumns, params),
            {
              owner: getOwnerIdObject(user),
            }
          )
        );
      }
    }

    cloneMetadata(ControllerService.Entity, EntityController);
    controllers.push(EntityController);
  }

  if (AclEntity != null) {
    const ShareEntityController = createAclController(Entity, {
      validatorOptions,
    });
    controllers.push(ShareEntityController);
  }

  getRelationController(Entity)?.properties.forEach((propertyName) => {
    const EntityRelationController = createOneToManyController(
      Entity,
      String(propertyName),
      {
        validatorOptions,
      }
    );
    controllers.push(EntityRelationController);
  });
  return controllers;
}

export function getPrimaryColumns<TEntity>(entity: Type<TEntity>) {
  const primaryColumns = getMetadataArgsStorage().columns.filter(
    (col) =>
      typeof col.target !== 'string' &&
      (entity === col.target || entity.prototype instanceof col.target) &&
      col.options.primary
  );

  return primaryColumns;
}

export function pickColumnProperties<T>(
  primaryColumns: ColumnMetadataArgs[],
  params: T
) {
  return fromPairs(
    primaryColumns.map((col) => [
      col.propertyName,
      params[col.propertyName as keyof T],
    ])
  ) as Record<keyof T, unknown>;
}

export function toColumnRoutePath(columns: (string | ColumnMetadataArgs)[]) {
  return columns
    .map((col) => `:${typeof col === 'string' ? col : col.propertyName}`)
    .join('/');
}

export function isGenerated(col: ColumnMetadataArgs): boolean {
  return (
    getMetadataArgsStorage().findGenerated(col.target, col.propertyName) != null
  );
}

export const ApiParams: (
  apiParamOptions: ApiParamOptions[]
) => MethodDecorator = (apiParamOptions) => (target, key, descriptor) => {
  apiParamOptions.forEach((option) =>
    ApiParam(option)(target, key, descriptor)
  );
};
