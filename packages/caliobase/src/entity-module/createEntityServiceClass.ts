import { Injectable, Type, UnauthorizedException } from '@nestjs/common';
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import { CaliobaseFindOptions, RenameClass, ToFindOptions } from '.';
import { CaliobaseRequestUser, Organization } from '../auth';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
import { getOrganizationFilter } from '../auth/decorators/owner.decorator';
import { unwrapValueWithContext } from '../lib/unwrapValueWithContext';
import {
  AccessPolicies,
  EffectivePolicy,
  PolicyStatements,
} from './decorators/AccessPolicies.decorator';
import { entityServiceQueryBuilder } from './entityServiceQueryBuilder';
import {
  ICaliobaseService,
  ICaliobaseServiceOptions,
  ICaliobaseServiceType,
} from './ICaliobaseService';
import { EntityActions, Roles } from './roles';

export function createEntityServiceClass<
  TEntity,
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

  function getUserPolicy(
    action: EntityActions,
    user: CaliobaseRequestUser,
    organization: Pick<Organization, 'id'>
  ) {
    const policy = getEffectivePolicy<TEntity>(
      entityType,
      action,
      policyStatements,
      {
        organization,
        user,
      }
    );

    if (policy?.effect === 'deny') {
      throw new UnauthorizedException(
        `user is not authorized to perform '${action}' on '${entityType.name}'`
      );
    }
    return policy;
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

    async create(
      createDto: TCreate,
      { organization, user }: ICaliobaseServiceOptions
    ) {
      return await this.dataSource.transaction(async (manager) => {
        const entityRepository = manager.getRepository(entityType);

        getUserPolicy('create', user, organization);

        const created: TEntity = await entityRepository.save(
          entityRepository.create({
            ...createDto,
            ...getOrganizationFilter(entityType, organization),
          }) as TEntity & ObjectLiteral // todo more narrow type
        );

        if (AclEntity != null) {
          const aclEntityRepository = manager.getRepository(AclEntity);
          const createdAcl = aclEntityRepository.create({
            access: 'owner',
            object: created as any, // todo remove any
            organization: organization,
          }) as ObjectLiteral; // todo more narrow type
          await aclEntityRepository.save(createdAcl);
        }

        return created;
      });
    }

    async findAll(
      { where, order }: CaliobaseFindOptions<TEntity>,
      { organization, user }: ICaliobaseServiceOptions
    ) {
      const policy = getUserPolicy('list', user, organization);

      return await this.dataSource.transaction(async (manager) => {
        return await entityServiceQueryBuilder(
          entityType,
          manager,
          { where, order },
          { organization, itemFilters: policy?.itemFilters }
        ).getMany();
      });
    }

    async findOne(
      { where, order }: CaliobaseFindOptions<TEntity>,
      { organization, user }: ICaliobaseServiceOptions
    ) {
      const policy = getUserPolicy('get', user, organization);

      return await this.dataSource.transaction(async (manager) => {
        return await entityServiceQueryBuilder(
          entityType,
          manager,
          { where, order },
          { organization, itemFilters: policy?.itemFilters }
        ).getOne();
      });
    }

    async update(
      where: FindOptionsWhere<TEntity>,
      updateDto: TUpdate,
      { organization, user }: ICaliobaseServiceOptions
    ) {
      const policy = getUserPolicy('update', user, organization);

      return await this.dataSource.transaction(async (manager) => {
        const allFound = await entityServiceQueryBuilder(
          entityType,
          manager,
          { where },
          {
            organization,
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
      { organization, user }: ICaliobaseServiceOptions
    ) {
      const policy = getUserPolicy('delete', user, organization);

      return await this.dataSource.transaction(async (manager) => {
        const allFound = await entityServiceQueryBuilder(
          entityType,
          manager,
          { where },
          {
            organization,
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

function getEffectivePolicy<TEntity>(
  entityType: Type<TEntity>,
  action: EntityActions,
  policyStatements: PolicyStatements<TEntity> | undefined,
  {
    organization,
    user,
  }: {
    organization: Pick<Organization, 'id'>;
    user: CaliobaseRequestUser;
  }
) {
  if (user.organization?.id !== organization.id) {
    throw new UnauthorizedException(
      'access token supplied is not applicable to this organization context'
    );
  }
  return policyStatements
    ?.filter((statement) => {
      if (statement.effect === 'deny') {
        throw new Error('deny statements are not implemented');
      }
      if (statement.users) {
        const statementUsers = statement.users;
        if (typeof statementUsers === 'function') {
          if (!statementUsers(user)) {
            return false;
          }
        } else {
          if (statementUsers.role) {
            const allowedRoles = Array.isArray(statementUsers.role)
              ? statementUsers.role
              : Roles.fromMiniumLevel(statementUsers.role);
            const someUserRoleIsAllowed =
              user?.member?.roles?.some((role) =>
                allowedRoles.includes(role)
              ) ?? false;
            if (!someUserRoleIsAllowed) {
              return false;
            }
          }
        }
      }
      if (statement.action !== '*' && !statement.action.includes(action)) {
        return false;
      }
      return true;
    })
    .reduce(
      (agg, { effect, items }) => {
        return {
          ...agg,
          effect,
          itemFilters: [
            ...agg.itemFilters,
            items ? unwrapValueWithContext(items, { user }) : {},
          ],
        };
      },
      <EffectivePolicy<TEntity>>{
        effect: getAclEntity(entityType) ? 'allow' : 'deny',
        itemFilters: [],
      }
    );
}
