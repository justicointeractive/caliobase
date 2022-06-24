import { compare, hash } from 'bcrypt';
import {
  Column,
  DataSource,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  RelationId,
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

export class UserPasswordRepository {
  static forDataSource(dataSource: DataSource) {
    return dataSource.getRepository(UserPassword).extend({
      async setUserPassword(user: User, password: string) {
        const hashed = await hash(password, 10);
        this.manager.connection.transaction(async (manager) => {
          await manager.delete(UserPassword, { user });
          await manager.save(UserPassword, { user, hash: hashed });
        });
      },

      async compareUserPassword(user: User, password: string) {
        const { hash } = (await this.findOne({
          where: { user },
        })) ?? {
          hash: null,
        };
        return await compare(password, hash ?? '');
      },
    });
  }
}
