import { Injectable } from '@nestjs/common';
import { async as cryptoRandomString } from 'crypto-random-string';
import { addDays } from 'date-fns';
import { DataSource } from 'typeorm';
import { User } from '.';
import { AuthService } from './auth.service';
import { MemberInvitationToken } from './entities/member-invitation-token.entity';
import { Member } from './entities/member.entity';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationBody } from './organization.controller';

@Injectable()
export class OrganizationService {
  private readonly userRepo = this.dataSource.getRepository(User);
  private readonly memberRepo = this.dataSource.getRepository(Member);
  private readonly orgRepo = this.dataSource.getRepository(Organization);
  private readonly memberInviteRepo = this.dataSource.getRepository(
    MemberInvitationToken
  );

  constructor(
    private dataSource: DataSource,
    private authService: AuthService
  ) {}

  async findUserMemberships(userId: string) {
    return await this.memberRepo.find({
      where: {
        userId,
      },
      relations: ['organization'],
    });
  }

  async createOrganization(
    userId: string,
    createRequest: CreateOrganizationBody
  ) {
    const organization = await this.orgRepo.save({ ...createRequest });

    await this.memberRepo.save({
      userId,
      organization,
    });

    return organization;
  }

  async createMemberAccessToken(userId: string, organizationId: string) {
    const member = await this.memberRepo.findOneOrFail({
      where: {
        userId,
        organizationId,
      },
      relations: ['user', 'organization'],
    });

    return await this.authService.sign({
      userId: member.userId,
      organizationId: member.organizationId,
    });
  }

  async createPublicAccessToken(
    userId?: string,
    onBehalfOfOrganizationId?: string
  ) {
    return await this.authService.sign({
      organizationId: Organization.PublicId,
      userId,
      onBehalfOfOrganizationId,
    });
  }

  async createInvitation(organizationId: string) {
    const token = await cryptoRandomString({
      length: 128,
      type: 'url-safe',
    });

    const invite = await this.memberInviteRepo.save({
      token,
      organization: { id: organizationId },
      validUntil: addDays(Date.now(), 7),
    });

    return invite;
  }

  async getInvitation(token: string) {
    const invite = await this.memberInviteRepo.findOne({
      where: { token },
    });

    return invite;
  }

  async claimInvitation(userId: string, token: string) {
    const { organization } = await this.memberInviteRepo.findOneOrFail({
      where: { token },
      relations: ['organization'],
    });
    const user = await this.userRepo.findOneOrFail({
      where: { id: userId },
    });

    const member = await this.memberRepo.save({ user, organization });

    return member;
  }
}
