import { ApiProperty } from '@nestjs/swagger';
import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';

import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity()
export class Member {
  @PrimaryColumn()
  @ApiProperty()
  organizationId!: string;

  @ManyToOne(() => Organization)
  @ApiProperty()
  organization!: Organization;

  @PrimaryColumn()
  @ApiProperty()
  userId!: string;

  @ManyToOne(() => User)
  @ApiProperty()
  user!: User;
}
