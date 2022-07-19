import { Injectable, Type } from '@nestjs/common';
import {
  DataSource,
  DeepPartial,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Repository,
} from 'typeorm';
import { User } from './entities/user.entity';

export class AbstractUserProfile {
  @PrimaryColumn()
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn()
  user!: User;
}

export abstract class AbstractProfileService<
  TUser extends AbstractUserProfile = AbstractUserProfile
> {
  abstract createUserProfile(
    user: User,
    profile: DeepPartial<TUser>
  ): Promise<TUser | null>;
}

export function createProfilesService<TUserProfile extends AbstractUserProfile>(
  user: Type<TUserProfile> | null
): Type<AbstractProfileService<TUserProfile>> {
  @Injectable()
  class ProfilesService extends AbstractProfileService<TUserProfile> {
    userProfileRepo: Repository<TUserProfile> | null;

    constructor(private dataSource: DataSource) {
      super();
      this.userProfileRepo = user && this.dataSource.getRepository(user);
    }

    async createUserProfile(
      user: User,
      profile: DeepPartial<TUserProfile>
    ): Promise<TUserProfile | null> {
      if (this.userProfileRepo == null) {
        return null;
      }
      return await this.userProfileRepo.save(
        this.userProfileRepo.create({ ...profile, user }) as TUserProfile
      );
    }
  }

  return ProfilesService;
}
