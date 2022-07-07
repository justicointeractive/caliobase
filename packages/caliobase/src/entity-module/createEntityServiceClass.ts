import { Injectable, Type, UnauthorizedException } from '@nestjs/common';
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import { CaliobaseFindOptions, RenameClass, ToFindOptions } from '.';
import { CaliobaseJwtPayload } from '../auth';
import { getAclAccessLevels } from '../auth/acl/acl';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
import { getCaliobaseOwnerOrganizationMixin } from '../auth/decorators/owner.decorator';
import {
  AccessPolicies,
  PolicyStatement,
  PolicyStatementAction,
} from './decorators/AccessPolicies.decorator';
import { entityServiceQueryBuilder } from './entityServiceQueryBuilder';
import {
  ICaliobaseService,
  ICaliobaseServiceOptions,
  ICaliobaseServiceType,
} from './ICaliobaseService';

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

  function getPolicy(user: CaliobaseJwtPayload, action: PolicyStatementAction) {
    const policy = policyStatements
      ?.filter((statement) => {
        if (
          statement.users &&
          statement.users.role &&
          !(user.role ?? []).includes(statement.users.role)
        ) {
          return false;
        }
        if (!statement.action.includes(action)) {
          return false;
        }
        return true;
      })
      .reduce(
        (filter, statement) => {
          return {
            ...filter,
            ...statement,
            item: statementItems(statement, user),
          };
        },
        <PolicyStatement<TEntity>>{ effect: 'deny' }
      );
    if (policy?.effect === 'deny') {
      throw new UnauthorizedException(
        `user is not authorized to perform ${action} on ${entityType.name}`
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

        getPolicy(user, 'create');

        const created: TEntity = await entityRepository.save(
          entityRepository.create({
            ...createDto,
            ...getCaliobaseOwnerOrganizationMixin(entityType, organization),
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
      const policy = getPolicy(user, 'list');

      return await this.dataSource.transaction(async (manager) => {
        return await entityServiceQueryBuilder(
          entityType,
          manager,
          { where: { ...where, ...statementItems(policy, user) }, order },
          organization
        ).getMany();
      });
    }

    async findOne(
      { where, order }: CaliobaseFindOptions<TEntity>,
      { organization, user }: ICaliobaseServiceOptions
    ) {
      const policy = getPolicy(user, 'get');

      return await this.dataSource.transaction(async (manager) => {
        return await entityServiceQueryBuilder(
          entityType,
          manager,
          { where: { ...where, ...statementItems(policy, user) }, order },
          organization
        ).getOne();
      });
    }

    async update(
      conditions: FindOptionsWhere<TEntity>,
      updateDto: TUpdate,
      { organization, user }: ICaliobaseServiceOptions
    ) {
      const policy = getPolicy(user, 'update');

      return await this.dataSource.transaction(async (manager) => {
        const allFound = await entityServiceQueryBuilder(
          entityType,
          manager,
          { where: { ...conditions, ...statementItems(policy, user) } },
          organization,
          getAclAccessLevels('writer')
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
      conditions: FindOptionsWhere<TEntity>,
      { organization, user }: ICaliobaseServiceOptions
    ) {
      const policy = getPolicy(user, 'delete');

      return await this.dataSource.transaction(async (manager) => {
        const allFound = await entityServiceQueryBuilder(
          entityType,
          manager,
          { where: { ...conditions, ...statementItems(policy, user) } },
          organization,
          getAclAccessLevels('writer')
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

function statementItems<T>(
  statement: PolicyStatement<T> | undefined,
  user: CaliobaseJwtPayload
) {
  return typeof statement?.items === 'function'
    ? statement.items({ user })
    : statement?.items;
}
