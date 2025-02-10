import { UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { async as cryptoRandomString } from 'crypto-random-string';
import {
  Column,
  DataSource,
  Entity,
  JoinColumn,
  MoreThanOrEqual,
  OneToOne,
  PrimaryColumn,
  RelationId,
} from 'typeorm';
import { assert } from '../../lib/assert';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class UserOtp extends BaseEntity {
  @PrimaryColumn()
  @RelationId((otp: UserOtp) => otp.user)
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;

  @Column()
  hash!: string;

  @Column()
  expiresAt!: Date;
}

export class UserOtpRepository {
  static forDataSource(dataSource: DataSource) {
    return dataSource.getRepository(UserOtp).extend({
      async createUserOtp(user: User) {
        const otp = await cryptoRandomString({ length: 6, type: 'numeric' });
        const otpHash = await hash(otp, 10);
        await this.manager.connection.transaction(async (manager) => {
          await manager.delete(UserOtp, { user });
          await manager.save(
            UserOtp,
            manager.create(UserOtp, {
              user,
              hash: otpHash,
              expiresAt: new Date(Date.now() + 1000 * 60 * 15),
            })
          );
        });
        return { otp };
      },

      async assertCurrentOtp(
        user: User | null,
        otp: string,
        consumeOtp = true
      ) {
        const matches = await this.compareUserOtp(user, otp);

        if (!matches) {
          throw new UnauthorizedException('otps do not match');
        }

        assert(user, Error, 'user is null');

        if (consumeOtp) {
          await this.manager.delete(UserOtp, { user });
        }
      },

      async compareUserOtp(user: User | null, otp: string) {
        const fromDb =
          user &&
          (await this.findOne({
            where: {
              userId: user.id,
              expiresAt: MoreThanOrEqual(new Date()),
            },
          }));

        const hash = fromDb?.hash;

        const result = await compare(otp, hash ?? '');

        if (user == null) {
          return false;
        }

        return result;
      },
    });
  }
}
