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
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class UserPassword extends BaseEntity {
  @PrimaryColumn()
  @RelationId((password: UserPassword) => password.user)
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
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
        const fromDb =
          user &&
          (await this.findOne({
            where: { userId: user.id },
          }));

        const hash = fromDb?.hash;

        const result = await compare(password, hash ?? '');

        if (user == null) {
          return false;
        }

        return result;
      },
    });
  }
}
