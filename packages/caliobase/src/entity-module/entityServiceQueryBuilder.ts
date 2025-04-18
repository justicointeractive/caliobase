import { Type } from '@nestjs/common';
import { fromPairs, toPairs } from 'lodash';
import {
  Brackets,
  EntityManager,
  FindOptionsWhere,
  ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata';
import { CaliobaseFindOptions } from '.';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
import { getOrganizationFilter } from '../auth/decorators/owner.decorator';
import { AllRoles, Role } from './roles';

export function entityServiceQueryBuilder<TEntity extends ObjectLiteral>(
  entityType: Type<TEntity>,
  entityManager: EntityManager,
  {
    where,
    order,
    select,
    limit,
    skip,
    loadEagerRelations,
    relations,
  }: CaliobaseFindOptions<TEntity>,
  {
    itemFilters,
    organization,
    aclAccessLevels = AllRoles,
  }: {
    itemFilters: FindOptionsWhere<TEntity>[] | undefined;
    organization: { id: string } | null;
    aclAccessLevels?: Role[];
  }
) {
  const repository = entityManager.getRepository(entityType);

  const query = repository.createQueryBuilder('entity');

  if (relations) {
    relations.forEach((relation) => {
      const parts = relation.split('.');
      const aliasParts = parts.slice(0, -1);
      const propertyName = parts.slice(-1)[0];
      const parentAlias = aliasParts.join('_') || 'entity';
      const ownAlias = [...aliasParts, propertyName].join('_');
      query.leftJoinAndSelect(`${parentAlias}.${propertyName}`, ownAlias);
    });
  } else if (loadEagerRelations !== false) {
    recursiveJoinEagerRelations(
      query,
      'entity',
      repository.metadata.relations,
      []
    );
  }

  for (const [key, value] of Object.entries(where)) {
    // if key is a *-to-many relation, join and filter on the relation
    if (
      repository.metadata.relations.find(
        (r) =>
          r.propertyName === key &&
          (r.relationType === 'many-to-many' ||
            r.relationType === 'one-to-many')
      )
    ) {
      const joinAlias = `${key}_where`;
      query.innerJoin(`entity.${key}`, joinAlias);
      for (const [k, v] of Object.entries(value)) {
        query.andWhere(`${joinAlias}.${k} = :${joinAlias}_${k}`, {
          [`${joinAlias}_${k}`]: v,
        });
      }
    } else {
      query.andWhere({ [key]: value });
    }
  }

  // *-to-many relations...

  // query.innerJoin(
  //   'entity.category',
  //   'category',
  //   'category.id = :categoryId',
  //   {}
  // );

  query.andWhere(
    new Brackets((qb) => {
      qb.andWhere(getOrganizationFilter(entityType, organization));

      qb.andWhere(
        new Brackets((qb) => {
          if (itemFilters && itemFilters.length > 0) {
            qb.orWhere(itemFilters);
          }

          const AclEntity = getAclEntity(entityType);
          if (AclEntity != null) {
            const { inPlaceholders, inValues } = prepareInClause(
              'aclAccessLevels',
              aclAccessLevels
            );

            qb.orWhere(
              `EXISTS(${query
                .subQuery()
                .from(AclEntity, 'acl')
                .select('id')
                .where(
                  `entity.id = acl.objectId AND acl.organizationId = :organizationId AND acl.access in (${inPlaceholders})`,
                  {
                    organizationId: organization?.id,
                    ...inValues,
                  }
                )
                .getQuery()})`
            );
          }
        })
      );
    })
  );

  if (order != null) {
    query.orderBy(
      fromPairs(
        toPairs(order).map(([key, value]) => [
          `entity.${key}`,
          value as 'ASC' | 'DESC',
        ])
      )
    );
  }

  // console.log(query.getQueryAndParameters());

  if (limit != null) {
    query.take(limit);
  }
  if (skip != null) {
    query.skip(skip);
  }

  if (select) {
    query.select(select.map(quote));
  }

  return query;
}

function recursiveJoinEagerRelations<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  prefix: string,
  relations: RelationMetadata[],
  stack: RelationMetadata[] = []
) {
  relations
    .filter((r) => r.isEager)
    .forEach((eagerRelation) => {
      const alias = [...stack, eagerRelation]
        .map((r) => r.propertyName)
        .join('_');
      query.leftJoinAndSelect(`${prefix}.${eagerRelation.propertyName}`, alias);
      if (!stack.includes(eagerRelation)) {
        recursiveJoinEagerRelations(
          query,
          alias,
          eagerRelation.inverseEntityMetadata.relations,
          [...stack, eagerRelation]
        );
      }
    });
}

function prepareInClause<T extends string>(prefix: string, values: T[]) {
  const inValues = values.reduce((agg, level, i) => {
    agg[`${prefix}${i}`] = level;
    return agg;
  }, {} as Record<string, string>);
  const inPlaceholders = values.map((_, i) => `:${prefix}${i}`).join(',');
  return { inPlaceholders, inValues };
}

function quote(key: string) {
  return `"${key}"`;
}
