import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Entity, ManyToOne, OneToMany } from 'typeorm';
import { RenameClass } from '../..';
import { decorateClass } from '../../util/decorateClass';
import { AclItem } from '../entities/acl.entity';
import { EntityAclMetadataKey, EntityAclPropertyMetadataKey } from './acl';

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
