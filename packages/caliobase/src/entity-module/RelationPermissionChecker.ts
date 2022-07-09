import { Type, UnauthorizedException } from '@nestjs/common';
import { DataSource, getMetadataArgsStorage, In } from 'typeorm';
import { getRequiredWriteAccessLevel } from '.';
import { CaliobaseRequestUser } from '..';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
import { relationColumnPropertyName } from './createOneToManyController';
import { Role, Roles } from './roles';

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
          read: 'guest',
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
    user?: CaliobaseRequestUser
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
    requiredLevel: Role,
    user: CaliobaseRequestUser
  ) {
    const AclEntity = getAclEntity(entity);
    if (AclEntity == null) {
      return true;
    }
    const result = await this.dataSource.getRepository(AclEntity).findOne({
      where: {
        ...primaryKey,
        access: In(Roles.fromMiniumLevel(requiredLevel)),
        organizationId: user?.member?.organization?.id,
      },
    });
    if (result == null) {
      throw new UnauthorizedException();
    }
  }
}
