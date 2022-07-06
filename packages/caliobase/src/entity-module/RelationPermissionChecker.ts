import { Type, UnauthorizedException } from '@nestjs/common';
import { DataSource, getMetadataArgsStorage, In } from 'typeorm';
import { getRequiredWriteAccessLevel } from '.';
import { CaliobaseJwtPayload } from '..';
import { AclAccessLevel, getAclAccessLevels } from '../auth/acl/acl';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
import { relationColumnPropertyName } from './createOneToManyController';

export class RelationPermissionChecker {
  constructor(private dataSource: DataSource, private ManyEntity: Type<any>) {}

  manySideRelationAccessRequired = getMetadataArgsStorage()
    .filterRelations(this.ManyEntity)
    .map((relation) => {
      const OneEntity =
        relation.type instanceof Function && (relation.type as () => any)();

      if (OneEntity == null) {
        throw new Error("could not get 'one' side of 'many to one' relation");
      }

      const oneSidePrimaryColumns = getMetadataArgsStorage()
        .filterColumns(OneEntity)
        .filter((col) => col.options.primary);

      const mapManySideToAclSide = oneSidePrimaryColumns.map((col) => [
        relationColumnPropertyName(relation, col),
        relationColumnPropertyName('object', col),
      ]);

      return {
        Entity: OneEntity,
        accessLevel: {
          write:
            getRequiredWriteAccessLevel(
              this.ManyEntity,
              relation.propertyName
            ) ?? 'writer',
          read: 'reader',
        } as const,
        extractAclPrimaryKey: (manyInstance: any) => {
          const key: Record<string, any> = {};
          mapManySideToAclSide.forEach(([manySide, oneSide]) => {
            key[oneSide] = manyInstance[manySide];
          });
          return key;
        },
      };
    });

  async checkPermissions<T>(
    operationLevel: 'read' | 'write',
    instance: T,
    user?: CaliobaseJwtPayload
  ) {
    if (user == null) {
      throw new UnauthorizedException();
    }
    for (const required of this.manySideRelationAccessRequired) {
      const checkLevel = required.accessLevel[operationLevel];
      await this.checkPermission(
        required.Entity,
        required.extractAclPrimaryKey(instance),
        checkLevel,
        user
      );
    }
  }

  private async checkPermission(
    entity: Type<any>,
    primaryKey: any,
    requiredLevel: AclAccessLevel,
    user: CaliobaseJwtPayload
  ) {
    const AclEntity = getAclEntity(entity);
    const result = await this.dataSource.getRepository(AclEntity).findOne({
      where: {
        ...primaryKey,
        access: In(getAclAccessLevels(requiredLevel)),
        organizationId: user.organizationId,
      },
    });
    if (result == null) {
      throw new UnauthorizedException();
    }
  }
}
