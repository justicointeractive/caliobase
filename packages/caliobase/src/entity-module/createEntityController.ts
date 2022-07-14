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
import { ToFindOptions } from '.';
import { CaliobaseRequestUser } from '../auth';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
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
import { cloneMetadata } from '../util/cloneMetadata';
import { createAclController } from './createAclController';
import { createOneToManyController } from './createOneToManyController';
import { CaliobaseEntity, getRelationController } from './decorators';
import { RenameClass } from './decorators/RenameClass.decorator';
import { ICaliobaseController } from './ICaliobaseController';
import { ICaliobaseService, ICaliobaseServiceType } from './ICaliobaseService';
import { RequestUser } from './RequestUser';

export type EntityControllerConstructor<TEntity> = new (
  service: ICaliobaseService<TEntity, Partial<TEntity>, Partial<TEntity>>
) => ICaliobaseController<TEntity>;

export function createEntityController<TEntity, TCreate, TUpdate>(
  ControllerService: ICaliobaseServiceType<TEntity, TCreate, TUpdate>,
  findManyOptions: Type<ToFindOptions<TEntity>>,
  validatorOptions: ValidatorOptions
): { controllers: Type<unknown>[]; otherEntities: Type<unknown>[] } {
  const Entity = ControllerService.Entity;

  const entityOptions = CaliobaseEntity.get<TEntity>(Entity);
  const entityHasOrganizationOwner = entityOptions?.organizationOwner !== false;

  function getOwnerIdMixIn(user?: CaliobaseRequestUser) {
    if (!entityHasOrganizationOwner) {
      return {};
    }

    const organizationId = user?.organization?.id;

    if (organizationId == null) {
      throw new Error(
        'supplied access token does not provide an appropriate owner id'
      );
    }

    return { organization: { id: organizationId } };
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
        @Param() params: Partial<TEntity>,
        @Request() { user }: RequestUser
      ) {
        assert(user, UnauthorizedException);
        return new PaginationItemResponse(
          await this.service.create(
            { ...createDto, ...params },
            {
              user,
              ...getOwnerIdMixIn(user),
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
            ...getOwnerIdMixIn(user),
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
        @Param() params: Partial<TEntity>,
        @Request() { user }: RequestUser
      ) {
        assert(user, UnauthorizedException);
        return new PaginationItemResponse(
          await this.service.findOne(
            { where: pickColumnProperties(primaryColumns, params as unknown) },
            {
              user,
              ...getOwnerIdMixIn(user),
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
        assert(user, UnauthorizedException);
        return new PaginationItemsResponse(
          await this.service.update(
            pickColumnProperties(primaryColumns, params as unknown),
            updateDto,
            {
              user,
              ...getOwnerIdMixIn(user),
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
              ...getOwnerIdMixIn(user),
            }
          )
        );
      }
    }

    cloneMetadata(ControllerService.Entity, EntityController);

    const extend = entityOptions?.controller?.extend ?? ((c) => c);
    const ExtendedEntityController = extend(EntityController);
    cloneMetadata(EntityController, ExtendedEntityController);

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

export const ApiParams: (
  apiParamOptions: ApiParamOptions[]
) => MethodDecorator = (apiParamOptions) => (target, key, descriptor) => {
  apiParamOptions.forEach((option) =>
    ApiParam(option)(target, key, descriptor)
  );
};
