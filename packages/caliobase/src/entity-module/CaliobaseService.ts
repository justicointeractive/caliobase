import { Type } from '@nestjs/common';
import { fromPairs, toPairs } from 'lodash';
import {
  DeepPartial,
  EntityManager,
  FindOptionsWhere,
  getConnection,
  ObjectLiteral,
} from 'typeorm';

import {
  AclAccessLevel,
  AclAccessLevels,
  getAclAccessLevels,
  getAclEntity,
  getAclProperty,
  getCaliobaseOwnerOrganizationMixin,
  ToFindOptions,
} from '..';

import {
  ICaliobaseService,
  ICaliobaseServiceOptions,
  ICaliobaseServiceType,
} from './ICaliobaseService';

import { CaliobaseFindOptions } from '.';

export function CaliobaseService<
  TEntity,
  TCreate extends DeepPartial<TEntity>,
  TUpdate extends DeepPartial<TEntity>
>(
  entity: Type<TEntity>,
  findManyOptions: Type<ToFindOptions<TEntity>>,
  createDto: Type<TCreate>,
  updateDto: Type<TUpdate>
): ICaliobaseServiceType<TEntity, TCreate, TUpdate> {
  const AclEntity = getAclEntity(entity);

  class CaliobaseServiceClass
    implements ICaliobaseService<TEntity, TCreate, TUpdate>
  {
    public static Entity = entity;

    public static CreateDto = createDto;

    public static UpdateDto = updateDto;

    public static FindManyOptions = findManyOptions;

    async create(createDto: TCreate, { owner }: ICaliobaseServiceOptions) {
      return await getConnection().transaction(async (manager) => {
        const entityRepository = manager.getRepository(entity);

        const created: TEntity = await entityRepository.save(
          entityRepository.create({
            ...createDto,
            ...getCaliobaseOwnerOrganizationMixin(entity, owner),
          }) as TEntity & ObjectLiteral // todo more narrow type
        );
        if (AclEntity != null) {
          const aclEntityRepository = manager.getRepository(AclEntity);
          const createdAcl = aclEntityRepository.create({
            access: 'owner',
            object: created as any, // todo remove any
            organization: owner,
          }) as ObjectLiteral; // todo more narrow type
          await aclEntityRepository.save(createdAcl);
        }
        return created;
      });
    }

    async findAll(
      { where, order }: CaliobaseFindOptions<TEntity>,
      { owner }: ICaliobaseServiceOptions
    ) {
      return await getConnection().transaction(async (manager) => {
        return await buildQuery(
          entity,
          manager,
          { where, order },
          owner
        ).getMany();
      });
    }

    async findOne(
      { where, order }: CaliobaseFindOptions<TEntity>,
      { owner }: ICaliobaseServiceOptions
    ) {
      return await getConnection().transaction(async (manager) => {
        return await buildQuery(
          entity,
          manager,
          { where, order },
          owner
        ).getOne();
      });
    }

    async update(
      conditions: FindOptionsWhere<TEntity>,
      updateDto: TUpdate,
      { owner }: ICaliobaseServiceOptions
    ) {
      return await getConnection().transaction(async (manager) => {
        const allFound = await buildQuery(
          entity,
          manager,
          { where: conditions },
          owner,
          getAclAccessLevels('writer')
        ).getMany();
        for (const found of allFound) {
          Object.assign(found, updateDto);
          await manager
            .getRepository(entity)
            .save(found as TEntity & ObjectLiteral);
        }
        return allFound;
      });
    }

    async remove(
      conditions: FindOptionsWhere<TEntity>,
      { owner }: ICaliobaseServiceOptions
    ) {
      return await getConnection().transaction(async (manager) => {
        const allFound = await buildQuery(
          entity,
          manager,
          { where: conditions },
          owner,
          getAclAccessLevels('writer')
        ).getMany();
        for (const found of allFound) {
          Object.assign(found, updateDto);
          await manager.getRepository(entity).remove(found);
        }
        return allFound;
      });
    }
  }

  return CaliobaseServiceClass;
}

export function buildQuery<TEntity>(
  entity: Type<TEntity>,
  entityManager: EntityManager,
  { where, order }: CaliobaseFindOptions<TEntity>,
  owner: { id: string },
  aclAccessLevels: AclAccessLevel[] = AclAccessLevels
) {
  const repository = entityManager.getRepository(entity);

  const query = repository.createQueryBuilder('entity');

  const { inPlaceholders, inValues } = prepareInClause(
    'aclAccessLevels',
    aclAccessLevels
  );

  repository.metadata.relations
    .filter((r) => r.isEager)
    .forEach((eagerRelation) => {
      query.leftJoinAndSelect(
        `entity.${eagerRelation.propertyName}`,
        eagerRelation.propertyName
      );
    });

  if (getAclProperty(entity) != null) {
    query.innerJoinAndSelect(
      `entity.${getAclProperty(entity)}`,
      'acl',
      `entity.id = acl.objectId AND acl.organizationId = :organizationId AND acl.access in (${inPlaceholders})`,
      {
        organizationId: owner.id,
        ...inValues,
      }
    );
  }

  query.where(where);

  if (order != null) {
    query.orderBy(
      fromPairs(toPairs(order).map(([key, value]) => [`entity.${key}`, value]))
    );
  }

  return query;
}

export function prepareInClause<T extends string>(prefix: string, values: T[]) {
  const inValues = values.reduce((agg, level, i) => {
    agg[`${prefix}${i}`] = level;
    return agg;
  }, {} as Record<string, string>);
  const inPlaceholders = values.map((_, i) => `:${prefix}${i}`).join(',');
  return { inPlaceholders, inValues };
}
