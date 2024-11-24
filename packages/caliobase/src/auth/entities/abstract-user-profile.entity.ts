import { JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export class AbstractUserProfile extends BaseEntity {
  @PrimaryColumn()
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;
}
