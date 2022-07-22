import { Column, Entity, ManyToOne, PrimaryColumn, RelationId } from 'typeorm';

import { User } from './user.entity';

@Entity()
export class UserSocialLogin {
  @RelationId((login: UserSocialLogin) => login.user)
  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @PrimaryColumn()
  provider!: string;

  @PrimaryColumn()
  providerUserId!: string;
}
