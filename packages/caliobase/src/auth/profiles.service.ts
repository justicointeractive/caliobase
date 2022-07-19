import { Injectable, Type } from '@nestjs/common';
import {
  DataSource,
  DeepPartial,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Repository,
} from 'typeorm';
import { Organization } from './entities';
import { User } from './entities/user.entity';

export class AbstractUserProfile {
  @PrimaryColumn()
  userId!: string;

  @OneToOne(() => User)
  @JoinColumn()
  user!: User;
}

export class AbstractOrganizationProfile {
  @PrimaryColumn()
  organizationId!: string;

  @OneToOne(() => Organization)
  @JoinColumn()
  organization!: Organization;
}

export abstract class AbstractProfileService<
  TUser extends AbstractUserProfile = AbstractUserProfile,
  TOrganization extends AbstractOrganizationProfile = AbstractOrganizationProfile
> {
  abstract createUserProfile(
    user: User,
    profile: DeepPartial<TUser>
  ): Promise<TUser | null>;

  abstract createOrganizationProfile(
    organization: Organization,
    profile: DeepPartial<TOrganization>
  ): Promise<TOrganization | null>;
}

export function createProfilesService<
  TUserProfile extends AbstractUserProfile,
  TOrganizationProfile extends AbstractOrganizationProfile
>(
  user: Type<TUserProfile> | null,
  organization: Type<TOrganizationProfile> | null
): Type<AbstractProfileService<TUserProfile, TOrganizationProfile>> {
  @Injectable()
  class ProfilesService extends AbstractProfileService<TUserProfile> {
    userProfileRepo: Repository<TUserProfile> | null;
    organizationProfileRepo: Repository<TOrganizationProfile> | null;

    constructor(private dataSource: DataSource) {
      super();
      this.userProfileRepo = user && this.dataSource.getRepository(user);
      this.organizationProfileRepo =
        organization && this.dataSource.getRepository(organization);
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

    async createOrganizationProfile(
      organization: Organization,
      profile: DeepPartial<TOrganizationProfile>
    ): Promise<TOrganizationProfile | null> {
      if (this.organizationProfileRepo == null) {
        return null;
      }
      return await this.organizationProfileRepo.save(
        this.organizationProfileRepo.create({
          ...profile,
          organization,
        }) as TOrganizationProfile
      );
    }
  }

  return ProfilesService;
}
