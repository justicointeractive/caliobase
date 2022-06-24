import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Member, Organization, User } from '../auth';

@Injectable()
export class MetaService {
  orgRepo = this.dataSource.getRepository(Organization);
  userRepo = this.dataSource.getRepository(User);
  memberRepo = this.dataSource.getRepository(Member);

  constructor(private dataSource: DataSource) {}

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
}
