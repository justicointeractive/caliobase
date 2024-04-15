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
  UnauthorizedException,
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
import { DeepPartial } from 'typeorm';
import { ToFindOptions } from '.';
import { CaliobaseRequestUser, Organization, User } from '../auth';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
import { cloneMetadata } from '../internal-utils/cloneMetadata';
import { assert } from '../lib/assert';
import {
  getPrimaryColumns,
  isGenerated,
  pickColumnProperties,
  toColumnRoutePath,
} from '../lib/columnUtils';
import {
  ApiCreatedItemResponse,
  ApiOkItemResponse,
  ApiOkPaginatedResponse,
  PaginationItemResponse,
  PaginationItemsResponse,
} from '../lib/envelopes';
import { ICaliobaseController } from './ICaliobaseController';
import { ICaliobaseService, ICaliobaseServiceType } from './ICaliobaseService';
import { RequestUser } from './RequestUser';
import { createAclController } from './createAclController';
import { createManyToManyController } from './createManyToManyController';
import { createOneToManyController } from './createOneToManyController';
import { CaliobaseEntity, getRelationController } from './decorators';
import { RenameClass } from './decorators/RenameClass.decorator';
import { findRelationMetadataArgs } from './findRelationMetadataArgs';

export type EntityControllerConstructor<TEntity> = new (
  service: ICaliobaseService<
    TEntity,
    DeepPartial<TEntity>,
    DeepPartial<TEntity>
  >
) => ICaliobaseController<TEntity>;

export function createEntityController<
  TEntity,
  TCreate extends DeepPartial<TEntity>,
  TUpdate extends DeepPartial<TEntity>
>(
  ControllerService: ICaliobaseServiceType<TEntity, TCreate, TUpdate>,
  findManyOptions: Type<ToFindOptions<TEntity>>,
  validatorOptions: ValidatorOptions
): { controllers: Type<unknown>[]; otherEntities: Type<unknown>[] } {
  const Entity = ControllerService.Entity;

  const entityOptions = CaliobaseEntity.get<TEntity>(Entity);
  const entityHasOrganizationOwner = entityOptions?.organizationOwner !== false;
  const entityHasUserOwner = entityOptions?.userOwner === true;

  function getOwnerIdMixIn(user?: CaliobaseRequestUser): {
    organization: Pick<Organization, 'id'> | null;
    user: Pick<User, 'id'> | null;
  } {
    const mixin: {
      user: Pick<User, 'id'> | null;
      organization: Pick<Organization, 'id'> | null;
    } = {
      user: null,
      organization: null,
    };

    if (entityHasOrganizationOwner) {
      const organizationId = user?.organization?.id;

      if (organizationId == null) {
        throw new Error(
          'supplied access token does not provide an appropriate owner id'
        );
      }

      mixin.organization = { id: organizationId };
    }

    if (entityHasUserOwner) {
      const userId = user?.user?.id;

      if (userId == null) {
        throw new Error(
          'supplied access token does not provide an appropriate owner id'
        );
      }

      mixin.user = { id: userId };
    }

    return mixin;
  }

  const AclEntity = getAclEntity(ControllerService.Entity);

  const primaryColumns = getPrimaryColumns(ControllerService.Entity);

  const primaryUngeneratedColumns = primaryColumns.filter(
    (col) => !isGenerated(col)
  );

  const primaryUngeneratedColumnParams: ApiParamOptions[] =
    primaryUngeneratedColumns.map((col) => ({
      name: col.propertyName,
      required: true,
    }));

  const primaryColumnParams: ApiParamOptions[] = primaryColumns.map((col) => ({
    name: col.propertyName,
    required: true,
  }));

  const primaryUngeneratedColumnRoutePath = toColumnRoutePath(
    primaryUngeneratedColumns
  );
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

      @Post(primaryUngeneratedColumnRoutePath)
      @ApiBody({
        type: ControllerService.CreateDto,
      })
      @ApiCreatedItemResponse(
        {
          type: ControllerService.Entity,
        },
        { nullable: false }
      )
      @ApiParams(primaryUngeneratedColumnParams)
      async create(
        @Body(
          new ValidationPipe({
            expectedType: ControllerService.CreateDto,
            ...validatorOptions,
          })
        )
        createDto: TCreate,
        @Param() params: DeepPartial<TEntity>,
        @Request() { user }: RequestUser
      ) {
        assert(user, UnauthorizedException);
        return new PaginationItemResponse(
          await this.service.create(
            { ...createDto, ...params, ...getOwnerIdMixIn(user) },
            {
              user,
            }
          )
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
        assert(user, UnauthorizedException);
        const { items, total } = await this.service.findAll(
          listOptions.toFindOptions(),
          {
            user,
          }
        );
        return new PaginationItemsResponse(items, total);
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
        @Param() params: DeepPartial<TEntity>,
        @Query(
          new ValidationPipe({
            expectedType: findManyOptions,
            ...validatorOptions,
          })
        )
        listOptions: ToFindOptions<TEntity> | null,
        @Request() { user }: RequestUser
      ) {
        assert(user, UnauthorizedException);
        return new PaginationItemResponse(
          await this.service.findOne(
            {
              ...listOptions?.toFindOptions(),
              where: pickColumnProperties(primaryColumns, params as unknown),
            },
            {
              user,
            }
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
        @Param() params: DeepPartial<TEntity>,
        @Body(
          new ValidationPipe({
            expectedType: ControllerService.UpdateDto,
            ...validatorOptions,
          })
        )
        updateDto: TUpdate,
        @Request() { user }: RequestUser
      ) {
        assert(user, UnauthorizedException);
        return new PaginationItemsResponse(
          await this.service.update(
            pickColumnProperties(primaryColumns, params as unknown),
            updateDto,
            {
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
        assert(user, UnauthorizedException);
        return new PaginationItemsResponse(
          await this.service.remove(
            pickColumnProperties(primaryColumns, params),
            {
              user,
            }
          )
        );
      }
    }

    cloneMetadata(ControllerService.Entity, EntityController);

    const extend = entityOptions?.controller?.extend;

    const ExtendedEntityController = extend
      ? (() => {
          Reflect.deleteMetadata('design:paramtypes', EntityController);
          Reflect.deleteMetadata('self:paramtypes', EntityController);
          return extend(EntityController, ControllerService);
        })()
      : EntityController;

    controllers.push(ExtendedEntityController);
  }

  if (AclEntity != null) {
    const { controller, manyEntity } = createAclController(Entity, {
      validatorOptions,
    });
    controllers.push(controller);
    otherEntities.push(manyEntity);
  }

  getRelationController(Entity)?.properties.forEach((propertyName) => {
    const relation = findRelationMetadataArgs(Entity, propertyName);

    switch (relation.relationType) {
      case 'one-to-many': {
        const { controller, manyEntity } = createOneToManyController(
          Entity,
          String(propertyName),
          {
            validatorOptions,
          }
        );
        controllers.push(controller);
        otherEntities.push(manyEntity);
        break;
      }
      case 'many-to-many': {
        const { controller, manyEntity } = createManyToManyController(
          Entity,
          String(propertyName),
          {
            validatorOptions,
          }
        );
        controllers.push(controller);
        otherEntities.push(manyEntity);
        break;
      }
      default: {
        throw new Error(
          `uncontrollable relation type '${relation.relationType}', only 'one-to-many' and 'many-to-many' are supported`
        );
      }
    }
  });

  return { controllers, otherEntities };
}

export const ApiParams: (
  apiParamOptions: ApiParamOptions[]
) => MethodDecorator = (apiParamOptions) => (target, key, descriptor) => {
  apiParamOptions.forEach((option) =>
    ApiParam(option)(target, key, descriptor)
  );
};
