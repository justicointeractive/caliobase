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
import { CaliobaseRequestUser } from '../auth';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
import {
  ApiCreatedItemResponse,
  ApiOkItemResponse,
  ApiOkPaginatedResponse,
  PaginationItemResponse,
  PaginationItemsResponse,
} from '../lib/envelopes';
import { cloneMetadata } from '../util/cloneMetadata';
import { createAclController } from './createAclController';
import { createOneToManyController } from './createOneToManyController';
import { getRelationController } from './decorators';
import { RenameClass } from './decorators/RenameClass.decorator';
import { ICaliobaseController } from './ICaliobaseController';
import { ICaliobaseServiceType } from './ICaliobaseService';
import { RequestUser } from './RequestUser';
import assert = require('assert');

export function createEntityController<TEntity, TCreate, TUpdate>(
  ControllerService: ICaliobaseServiceType<TEntity, TCreate, TUpdate>,
  findManyOptions: Type<ToFindOptions<TEntity>>,
  validatorOptions: ValidatorOptions
): { controllers: Type<unknown>[]; otherEntities: Type<unknown>[] } {
  const Entity = ControllerService.Entity;

  function getOwnerIdObject(jwt?: CaliobaseRequestUser) {
    const id = jwt?.member?.organizationId;
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

  const otherEntities: Type<unknown>[] = [];
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
      @ApiCreatedItemResponse(
        {
          type: ControllerService.Entity,
        },
        { nullable: false }
      )
      async create(
        @Body(
          new ValidationPipe({
            expectedType: ControllerService.CreateDto,
            ...validatorOptions,
          })
        )
        createDto: TCreate,
        @Request() { user }: RequestUser
      ) {
        assert(user);
        return new PaginationItemResponse(
          await this.service.create(createDto, {
            organization: getOwnerIdObject(user),
            user,
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
        @Query(
          new ValidationPipe({
            expectedType: findManyOptions,
            ...validatorOptions,
          })
        )
        listOptions: ToFindOptions<TEntity>,
        @Request() { user }: RequestUser
      ) {
        assert(user);
        return new PaginationItemsResponse(
          await this.service.findAll(listOptions.toFindOptions(), {
            organization: getOwnerIdObject(user),
            user,
          })
        );
      }

      @Get(primaryColumnRoutePath)
      @ApiOkItemResponse(
        {
          type: ControllerService.Entity,
        },
        { nullable: true }
      )
      @ApiParams(primaryColumnParams)
      async findOne(
        @Param() params: Partial<TEntity>,
        @Request() { user }: RequestUser
      ) {
        assert(user);
        return new PaginationItemResponse(
          await this.service.findOne(
            { where: pickColumnProperties(primaryColumns, params as unknown) },
            { organization: getOwnerIdObject(user), user }
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
        @Param() params: Partial<TEntity>,
        @Body(
          new ValidationPipe({
            expectedType: ControllerService.UpdateDto,
            ...validatorOptions,
          })
        )
        updateDto: TUpdate,
        @Request() { user }: RequestUser
      ) {
        assert(user);
        return new PaginationItemsResponse(
          await this.service.update(
            pickColumnProperties(primaryColumns, params as unknown),
            updateDto,
            {
              organization: getOwnerIdObject(user),
              user,
            }
          )
        );
      }

      @Delete(primaryColumnRoutePath)
      @ApiParams(primaryColumnParams)
      @ApiOkPaginatedResponse({
        type: ControllerService.Entity,
      })
      async remove(@Param() params: unknown, @Request() { user }: RequestUser) {
        assert(user);
        return new PaginationItemsResponse(
          await this.service.remove(
            pickColumnProperties(primaryColumns, params),
            {
              organization: getOwnerIdObject(user),
              user,
            }
          )
        );
      }
    }

    cloneMetadata(ControllerService.Entity, EntityController);
    controllers.push(EntityController);
  }

  if (AclEntity != null) {
    const { controller, manyEntity } = createAclController(Entity, {
      validatorOptions,
    });
    controllers.push(controller);
    otherEntities.push(manyEntity);
  }

  getRelationController(Entity)?.properties.forEach((propertyName) => {
    const { controller, manyEntity } = createOneToManyController(
      Entity,
      String(propertyName),
      {
        validatorOptions,
      }
    );
    controllers.push(controller);
    otherEntities.push(manyEntity);
  });

  return { controllers, otherEntities };
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
