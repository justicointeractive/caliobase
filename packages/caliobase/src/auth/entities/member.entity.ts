import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';

import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity()
export class Member {
  @PrimaryColumn()
  organizationId!: string;

  @ManyToOne(() => Organization)
  organization!: Organization;

  @PrimaryColumn()
  userId!: string;

  @ManyToOne(() => User)
  user!: User;
}
