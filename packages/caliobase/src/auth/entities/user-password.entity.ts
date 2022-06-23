import { compare, hash } from 'bcrypt';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  RelationId,
  Repository,
} from 'typeorm';

import { User } from './user.entity';

@Entity()
export class UserPassword {
  @PrimaryColumn()
  @RelationId((password: UserPassword) => password.user)
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn()
  user!: User;

  @Column()
  hash!: string;
}

export class UserRepository extends Repository<UserPassword> {
  async setUserPassword(user: User, password: string) {
    const hashed = await hash(password, 10);
    this.manager.connection.transaction(async (manager) => {
      await manager.delete(UserPassword, { user });
      await manager.save(UserPassword, { user, hash: hashed });
    });
  }

  async compareUserPassword(user: User, password: string) {
    const { hash: hashed } = (await this.findOne({
      where: { user: user },
    })) ?? {
      hash: null,
    };
    return hashed != null && (await compare(password, hashed));
  }
}
