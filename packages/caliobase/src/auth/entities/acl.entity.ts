import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Column, ManyToOne, PrimaryColumn } from 'typeorm';
import { Organization } from '.';
import { RequireWriteAccessLevel } from '../../entity-module/decorators/RequireAccessLevel.decorator';
import { AllRoles, Role } from '../../entity-module/roles';

export type Acl<T> = AclItem<T>[];

export abstract class AclItem<T> {
  @PrimaryColumn()
  objectId!: string;

  @RequireWriteAccessLevel('manager')
  abstract object: T;

  @Column({ type: String })
  @ApiProperty({
    type: String,
    enum: AllRoles,
  })
  @IsIn(AllRoles)
  access!: Role;

  @PrimaryColumn()
  @ApiProperty()
  organizationId!: string;

  @ManyToOne(() => Organization)
  @ApiProperty()
  organization!: Organization;
}
