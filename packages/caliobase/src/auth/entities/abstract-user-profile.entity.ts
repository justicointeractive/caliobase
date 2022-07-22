import { JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

export class AbstractUserProfile {
  @PrimaryColumn()
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;
}
