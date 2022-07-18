import { UnauthorizedException } from '@nestjs/common';
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
        await this.manager.connection.transaction(async (manager) => {
          await manager.delete(UserPassword, { user });
          await manager.save(
            UserPassword,
            manager.create(UserPassword, { user, hash: hashed })
          );
        });
      },

      async assertCurrentPassword(user: User | null, password: string) {
        const matches = await this.compareUserPassword(user, password);

        if (!matches) {
          throw new UnauthorizedException('passwords do not match');
        }
      },

      async compareUserPassword(user: User | null, password: string) {
        const { hash } = (await this.findOne({
          where: { user: user ?? undefined },
        })) ?? {
          hash: null,
        };

        const result = await compare(password, hash ?? '');

        if (user == null) {
          return false;
        }

        return result;
      },
    });
  }
}
