import { Type } from '@nestjs/common';
import { fromPairs, toPairs } from 'lodash';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata';
import { CaliobaseFindOptions } from '.';
import { AclAccessLevel, AclAccessLevels } from '../auth/acl/acl';
import { getAclProperty } from '../auth/acl/getAclEntityAndProperty';
import { getOrganizationFilter } from '../auth/decorators/owner.decorator';

export function entityServiceQueryBuilder<TEntity>(
  entityType: Type<TEntity>,
  entityManager: EntityManager,
  { where, order }: CaliobaseFindOptions<TEntity>,
  organization: { id: string },
  aclAccessLevels: AclAccessLevel[] = AclAccessLevels
) {
  const repository = entityManager.getRepository(entityType);

  const query = repository.createQueryBuilder('entity');

  const { inPlaceholders, inValues } = prepareInClause(
    'aclAccessLevels',
    aclAccessLevels
  );

  recursiveJoinEagerRelations(
    query,
    'entity',
    repository.metadata.relations,
    []
  );

  query.where({
    ...where,
    ...getOrganizationFilter(entityType, organization),
  });

  if (getAclProperty(entityType) != null) {
    query.innerJoinAndSelect(
      `entity.${getAclProperty(entityType)}`,
      'acl',
      `entity.id = acl.objectId AND acl.organizationId = :organizationId AND acl.access in (${inPlaceholders})`,
      {
        organizationId: organization.id,
        ...inValues,
      }
    );
  }

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

  return query;
}

function recursiveJoinEagerRelations(
  query: SelectQueryBuilder<unknown>,
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
