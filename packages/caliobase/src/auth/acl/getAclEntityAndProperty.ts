import { Type } from '@nestjs/common';
import type { AclItem } from '../entities/acl.entity';
import { EntityAclMetadataKey, EntityAclPropertyMetadataKey } from './acl';

function getAclEntityAndProperty<T>(target: Type<T>) {
  const AclEntity = Reflect.getMetadata(EntityAclMetadataKey, target) as Type<
    AclItem<T>
  >;

  const entityAclProperty = Reflect.getMetadata(
    EntityAclPropertyMetadataKey,
    target
  ) as string;

  return { AclEntity, entityAclProperty };
}

export function getAclEntity<T>(target: Type<T>) {
  const { AclEntity } = getAclEntityAndProperty(target);
  return AclEntity;
}

export function getAclProperty<T>(target: Type<T>) {
  const { entityAclProperty } = getAclEntityAndProperty(target);
  return entityAclProperty;
}
