import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { async as cryptoRandomString } from 'crypto-random-string';
import { addDays } from 'date-fns';
import { DataSource, MoreThanOrEqual } from 'typeorm';
import { CaliobaseConfig } from '../config/config';
import { Role, Roles } from '../entity-module/roles';
import { assert } from '../lib/assert';
import { AuthService } from './auth.service';
import { CreateOrganizationRequest } from './CreateOrganizationRequest';
import { MemberInvitationToken } from './entities/member-invitation-token.entity';
import { Member } from './entities/member.entity';
import { Organization } from './entities/organization.entity';
import { User } from './entities/user.entity';

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
    private authService: AuthService,
    private caliobaseConfig: CaliobaseConfig
  ) {}

  async findUserMemberships(userId: string) {
    return await this.memberRepo.find({
      where: {
        userId,
      },
      relations: ['organization'],
    });
  }

  async getMember(userId: string, organizationId: string) {
    return await this.memberRepo.findOneOrFail({
      where: {
        userId,
        organizationId,
      },
      relations: ['user', 'organization'],
    });
  }

  async createOrganization(
    userId: string,
    createRequest: CreateOrganizationRequest
  ) {
    const organization = await this.orgRepo.save({ ...createRequest });

    await this.memberRepo.save({
      userId,
      organization,
      roles: ['owner'],
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

  async createGuestAccessToken(organizationId: string) {
    return await this.authService.sign({
      organizationId,
    });
  }

  async createInvitation(
    organizationId: string,
    invitedBy: Member,
    roles: Role[]
  ) {
    const token = await cryptoRandomString({
      length: 128,
      type: 'url-safe',
    });

    const allowedToGrantRoles = [
      ...new Set(invitedBy.roles.flatMap((role) => Roles.fromMaxLevel(role))),
    ];

    if (roles.some((role) => !allowedToGrantRoles.includes(role))) {
      throw new UnauthorizedException('user is not allowed to grant this role');
    }

    const invite = await this.memberInviteRepo.save({
      token,
      organization: { id: organizationId },
      validUntil: addDays(Date.now(), 7),
      roles,
      invitedBy: invitedBy.user,
    });

    return invite;
  }

  async getInvitation(token: string) {
    const invite = await this.memberInviteRepo.findOne({
      where: { token, validUntil: MoreThanOrEqual(new Date()) },
    });

    return invite;
  }

  async claimInvitation(userId: string, token: string) {
    const invitation = await this.getInvitation(token);

    assert(invitation, undefined, NotFoundException);

    const { organization, roles } = await this.memberInviteRepo.findOneOrFail({
      where: { token },
      relations: ['organization'],
    });

    const user = await this.userRepo.findOneOrFail({
      where: { id: userId },
    });

    const member = await this.memberRepo.save({ user, organization, roles });

    invitation.validUntil = new Date();

    await this.memberInviteRepo.save(invitation);

    return member;
  }

  async joinAsGuest(organization: Organization, user: User) {
    const role = this.caliobaseConfig.guestRole;

    if (!role) {
      throw new UnauthorizedException(
        'guests are not allowed to join organizations'
      );
    }

    const roles = [role];

    const member = await this.memberRepo.save({
      user,
      organization,
      roles,
    });

    return member;
  }
}
