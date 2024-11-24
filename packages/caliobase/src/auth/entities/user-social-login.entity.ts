import { Column, Entity, ManyToOne, PrimaryColumn, RelationId } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class UserSocialLogin extends BaseEntity {
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
