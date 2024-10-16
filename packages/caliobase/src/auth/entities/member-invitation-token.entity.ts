import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Role } from '../../entity-module/roles';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity()
export class MemberInvitationToken extends BaseEntity {
  @PrimaryColumn()
  @ApiProperty()
  token!: string;

  @Column()
  @ApiProperty()
  validUntil!: Date;

  @ApiProperty()
  @ManyToOne(() => Organization, { nullable: false })
  organization!: Organization;

  @ApiProperty()
  @ManyToOne(() => User, { nullable: false })
  invitedBy!: User;

  @ApiProperty()
  @Column({ type: 'simple-json' })
  roles!: Role[];
}
