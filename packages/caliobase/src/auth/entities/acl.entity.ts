import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Column, ManyToOne, PrimaryColumn } from 'typeorm';
import { Organization } from '.';
import { RequireWriteAccessLevel } from '../../entity-module/decorators/RequireAccessLevel.decorator';
import { AclAccessLevel, AclAccessLevels } from '../acl/acl';

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
