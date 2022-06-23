import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
  Type,
  Request,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ValidatorOptions } from 'class-validator';
import { fromPairs } from 'lodash';
import { getMetadataArgsStorage } from 'typeorm';
import { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs';

import { getAclEntity } from '..';
import { CaliobaseJwtPayload } from '../auth/jwt-payload';
import { getRelationController } from '../entity-module/decorators';
import { cloneMetadata } from '../util/cloneMetadata';

import { ICaliobaseController } from './ICaliobaseController';
import { ICaliobaseServiceType } from './ICaliobaseService';
import { createAclController } from './createAclController';
import { createOneToManyController } from './createOneToManyController';
import { RenameClass } from './decorators/RenameClass.decorator';

import { ToFindOptions } from '.';

export function CaliobaseController<TEntity, TCreate, TUpdate>(
  ControllerService: ICaliobaseServiceType<TEntity, TCreate, TUpdate>,
  findManyOptions: Type<ToFindOptions<TEntity>>,
  validatorOptions: ValidatorOptions,
): Type<any>[] {
  const Entity = ControllerService.Entity;

  function getOwnerIdObject(jwt?: CaliobaseJwtPayload) {
    const id = jwt && jwt.organizationId;
    if (id == null) {
      throw new Error(
        'supplied access token does not provide an appropriate owner id',
      );
    }
    return { id };
  }

  const AclEntity = getAclEntity(ControllerService.Entity);

  const primaryColumns = getPrimaryColumns(ControllerService.Entity);

  const primaryColumnRoutePath = toColumnRoutePath(primaryColumns);

  const controllers: Type<any>[] = [];
  {
    @RenameClass(ControllerService.Entity)
    class EntityController implements ICaliobaseController<TEntity> {
      constructor(
        @Inject(ControllerService)
        public readonly service: InstanceType<typeof ControllerService>,
      ) {}

      @Post()
      @ApiBody({
        type: ControllerService.CreateDto,
      })
      @ApiCreatedResponse({
        type: ControllerService.Entity,
      })
      create(
        @Body(
          new ValidationPipe({
            expectedType: ControllerService.CreateDto,
            ...validatorOptions,
          }),
        )
        createDto: TCreate,
        @Request() { user }: Express.Request,
      ) {
        return this.service.create(createDto, {
          owner: getOwnerIdObject(user),
        });
      }

      @Get()
      @ApiQuery({
        type: findManyOptions,
      })
      @ApiOkResponse({
        type: [ControllerService.Entity],
      })
      findAll(
        @Request() { user }: Express.Request,
        @Query(
          new ValidationPipe({
            expectedType: findManyOptions,
            ...validatorOptions,
          }),
        )
        listOptions: ToFindOptions<TEntity>,
      ) {
        return this.service.findAll(listOptions.toFindOptions(), {
          owner: getOwnerIdObject(user),
        });
      }

      @Get(primaryColumnRoutePath)
      @ApiOkResponse({
        type: ControllerService.Entity,
      })
      findOne(@Param() params: any, @Request() { user }: Express.Request) {
        return this.service.findOne(
          { where: pickColumnProperties(primaryColumns, params) },
          { owner: getOwnerIdObject(user) },
        );
      }

      @Patch(primaryColumnRoutePath)
      @ApiBody({
        type: ControllerService.UpdateDto,
      })
      update(
        @Param() params: any,
        @Body(
          new ValidationPipe({
            expectedType: ControllerService.UpdateDto,
            ...validatorOptions,
          }),
        )
        updateDto: TUpdate,
        @Request() { user }: Express.Request,
      ) {
        return this.service.update(
          pickColumnProperties(primaryColumns, params),
          updateDto,
          {
            owner: getOwnerIdObject(user),
          },
        );
      }

      @Delete(primaryColumnRoutePath)
      remove(@Param() params: any, @Request() { user }: Express.Request) {
        return this.service.remove(
          pickColumnProperties(primaryColumns, params),
          {
            owner: getOwnerIdObject(user),
          },
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
      },
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
      col.options.primary,
  );

  return primaryColumns;
}

export function pickColumnProperties<T>(
  primaryColumns: ColumnMetadataArgs[],
  params: T,
) {
  return fromPairs(
    primaryColumns.map((col) => [
      col.propertyName,
      params[col.propertyName as keyof T],
    ]),
  ) as Record<keyof T, any>;
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
