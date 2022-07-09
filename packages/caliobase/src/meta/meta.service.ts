import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthService, Member, Organization, User } from '../auth';
import { CreateRootRequest } from './CreateRootRequest';

@Injectable()
export class MetaService {
  orgRepo = this.dataSource.getRepository(Organization);
  userRepo = this.dataSource.getRepository(User);
  memberRepo = this.dataSource.getRepository(Member);

  constructor(
    private dataSource: DataSource,
    private authService: AuthService
  ) {}

  async assertHasNoRootMember() {
    if (await this.getHasRootMember()) {
      throw new Error('this can only be called once upon initial setup');
    }
  }

  async assertHasRootMember() {
    if (!(await this.getHasRootMember())) {
      throw new Error('cannot continue without a root member');
    }
  }

  async getHasRootMember() {
    const rootOrg = await this.orgRepo.findOne({
      where: { id: Organization.RootId },
    });

    if (rootOrg == null) {
      return false;
    }

    const rootMember = await this.memberRepo.findOne({
      where: {
        organization: rootOrg,
      },
    });

    if (rootMember == null) {
      return false;
    }

    return true;
  }

  async getRoot() {
    const organization: Organization = await this.orgRepo.findOneOrFail({
      where: { id: Organization.RootId },
    });
    return {
      organization,
    };
  }

  async createRoot(create: CreateRootRequest) {
    await this.assertHasNoRootMember();

    const user: User = await this.authService.createUserWithPassword({
      email: create.user.email,
      password: create.user.password,
      givenName: create.user.givenName,
      familyName: create.user.familyName,
    });

    const organization: Organization = await this.orgRepo.save({
      id: Organization.RootId,
      name: create.organization.name,
    });

    const member: Member = await this.memberRepo.save({ user, organization });

    return member;
  }
}
