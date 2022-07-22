import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Role } from '../../entity-module/roles';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity()
export class Member {
  @PrimaryColumn()
  @ApiProperty()
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @ApiProperty()
  organization!: Organization;

  @PrimaryColumn()
  @ApiProperty()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @ApiProperty()
  user!: User;

  @ApiProperty()
  @Column({ type: 'simple-json' })
  roles!: Role[];
}
