import type { AclItem } from '../entities/acl.entity';

export const EntityAclMetadataKey = Symbol('entity_acl');
export const EntityAclPropertyMetadataKey = Symbol('entity_acl_property');

export const AclAccessLevels = [
  ...(['owner', 'manager', 'writer', 'reader'] as const),
].reverse();
export type AclAccessLevel = typeof AclAccessLevels[number];

export function getAclAccessLevels(minLevel: AclAccessLevel) {
  const allowedLevels = AclAccessLevels.slice(
    AclAccessLevels.indexOf(minLevel)
  );
  return allowedLevels;
}

export type Acl<T> = AclItem<T>[];
