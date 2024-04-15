import { Injectable, Type } from '@nestjs/common';
import { invariant } from 'circumspect';
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import { CaliobaseFindOptions, RenameClass, ToFindOptions } from '.';
import { CaliobaseRequestUser } from '../auth';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
import { getOrganizationFilter } from '../auth/decorators/owner.decorator';
import {
  ICaliobaseService,
  ICaliobaseServiceOptions,
  ICaliobaseServiceType,
} from './ICaliobaseService';
import { AccessPolicies } from './decorators/AccessPolicies.decorator';
import { entityServiceQueryBuilder } from './entityServiceQueryBuilder';
import { getPolicyFromStatements } from './getPolicyFromStatements';
import { EntityActions, Roles } from './roles';

export function createEntityService<
  TEntity extends ObjectLiteral,
  TCreate extends DeepPartial<TEntity>,
  TUpdate extends DeepPartial<TEntity>
>(
  entityType: Type<TEntity>,
  findManyOptions: Type<ToFindOptions<TEntity>>,
  createDto: Type<TCreate>,
  updateDto: Type<TUpdate>
): ICaliobaseServiceType<TEntity, TCreate, TUpdate> {
  const AclEntity = getAclEntity(entityType);

  const policyStatements = AccessPolicies.get(entityType);

  function getUserPolicy(action: EntityActions, user: CaliobaseRequestUser) {
    return getPolicyFromStatements<TEntity>({
      entityType,
      action,
      policyStatements,
      user,
    });
  }

  @Injectable()
  @RenameClass(entityType)
  class CaliobaseServiceClass
    implements ICaliobaseService<TEntity, TCreate, TUpdate>
  {
    public static Entity = entityType;

    public static CreateDto = createDto;

    public static UpdateDto = updateDto;

    public static FindManyOptions = findManyOptions;

    constructor(private dataSource: DataSource) {}

    async create(createDto: TCreate, { user }: ICaliobaseServiceOptions) {
      return await this.dataSource.transaction(async (manager) => {
        const entityRepository = manager.getRepository(entityType);

        getUserPolicy('create', user);

        const created: TEntity = await entityRepository.save(
          entityRepository.create({
            ...createDto,
            ...getOrganizationFilter(entityType, user.organization),
          })
        );

        if (AclEntity != null) {
          invariant(user.organization, 'User must have an organization');
          const aclEntityRepository = manager.getRepository(AclEntity);
          await aclEntityRepository.save(
            aclEntityRepository.create({
              access: 'owner',
              object: created as TEntity,
              organization: user.organization,
            })
          );
        }

        return created;
      });
    }

    async findAll(
      findOptions: CaliobaseFindOptions<TEntity>,
      { user }: ICaliobaseServiceOptions
    ) {
      const policy = getUserPolicy('list', user);

      return await this.dataSource.transaction(async (manager) => {
        const [items, total] = await entityServiceQueryBuilder(
          entityType,
          manager,
          findOptions,
          { organization: user.organization, itemFilters: policy?.itemFilters }
        ).getManyAndCount();
        return { items, total };
      });
    }

    async findOne(
      findOptions: CaliobaseFindOptions<TEntity>,
      { user }: ICaliobaseServiceOptions
    ) {
      const policy = getUserPolicy('get', user);

      return await this.dataSource.transaction(async (manager) => {
        return await entityServiceQueryBuilder(
          entityType,
          manager,
          findOptions,
          { organization: user.organization, itemFilters: policy?.itemFilters }
        ).getOne();
      });
    }

    async update(
      where: FindOptionsWhere<TEntity>,
      updateDto: TUpdate,
      { user }: ICaliobaseServiceOptions
    ) {
      const policy = getUserPolicy('update', user);

      return await this.dataSource.transaction(async (manager) => {
        const allFound = await entityServiceQueryBuilder(
          entityType,
          manager,
          { where },
          {
            organization: user.organization,
            itemFilters: policy?.itemFilters,
            aclAccessLevels: Roles.fromMiniumLevel('writer'),
          }
        ).getMany();
        for (const found of allFound) {
          Object.assign(found, updateDto);
          await manager
            .getRepository(entityType)
            .save(found as TEntity & ObjectLiteral);
        }
        return allFound;
      });
    }

    async remove(
      where: FindOptionsWhere<TEntity>,
      { user }: ICaliobaseServiceOptions
    ) {
      const policy = getUserPolicy('delete', user);

      return await this.dataSource.transaction(async (manager) => {
        const allFound = await entityServiceQueryBuilder(
          entityType,
          manager,
          { where },
          {
            organization: user.organization,
            itemFilters: policy?.itemFilters,
            aclAccessLevels: Roles.fromMiniumLevel('writer'),
          }
        ).getMany();
        for (const found of allFound) {
          await manager.getRepository(entityType).remove(found);
        }
        return allFound;
      });
    }
  }

  return CaliobaseServiceClass;
}
