import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';

import { RenameClass } from '../..';
import { RequireWriteAccessLevel } from '../../entity-module';
import { decorateClass } from '../../util/decorateClass';

import { Organization } from '.';

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

export abstract class AclItem<T> {
  @PrimaryColumn()
  objectId!: string;

  @RequireWriteAccessLevel('manager')
  abstract object: T;

  @Column({ type: String })
  @ApiProperty({
    type: String,
    enum: AclAccessLevels,
  })
  @IsIn(AclAccessLevels)
  access!: AclAccessLevel;

  @PrimaryColumn()
  @ApiProperty()
  organizationId!: string;

  @ManyToOne(() => Organization)
  @ApiProperty()
  organization!: Organization;
}

export function createAclForEntity<T>(
  entityClass: Type<T>,
  targetEntityAclProperty: keyof T
) {
  @RenameClass(entityClass.name + 'Acl', EntityAclItem.name)
  class EntityAclItem extends AclItem<T> {
    @ManyToOne(
      () => entityClass,
      (entityClass) => entityClass[targetEntityAclProperty as keyof T],
      { onDelete: 'CASCADE', persistence: false }
    )
    @ApiProperty({ type: entityClass })
    object!: T;
  }
  decorateClass(EntityAclItem, [Entity()]);

  decorateClass(
    entityClass,
    [
      Reflect.metadata(EntityAclMetadataKey, EntityAclItem),
      Reflect.metadata(EntityAclPropertyMetadataKey, targetEntityAclProperty),
    ],
    [
      [
        targetEntityAclProperty,
        [
          ApiProperty({ type: [EntityAclItem] }),
          OneToMany(
            () => EntityAclItem,
            (entity) => entity.object,
            { persistence: false }
          ),
        ],
      ],
    ]
  );
}

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
