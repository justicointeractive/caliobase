import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { AllRoles, Role } from '../entity-module/roles';
import { AccessTokenResponse } from './auth.controller';
import { CreateOrganizationRequest } from './CreateOrganizationRequest';
import { Public } from './decorators';
import { MemberInvitationToken } from './entities/member-invitation-token.entity';
import { Member } from './entities/member.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationService } from './organization.service';
import assert = require('assert');

class CreateInvitationRequest {
  @IsIn(AllRoles)
  roles!: Role[];
}

@ApiTags('organization')
@Controller('organization')
@ApiBearerAuth()
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  @Get()
  @ApiOkResponse({ type: [Member] })
  async findAll(@Request() request: Express.Request) {
    const userId = request.user?.user?.id;
    assert(userId);
    return await this.orgService.findUserMemberships(userId);
  }

  @Post()
  @ApiCreatedResponse({ type: Organization })
  @ApiBody({ type: CreateOrganizationRequest })
  async create(
    @Body() body: CreateOrganizationRequest,
    @Request() request: Express.Request
  ) {
    const userId = request.user?.user?.id;
    assert(userId);
    return this.orgService.createOrganization(userId, body);
  }

  @Public()
  @Post('token')
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async getRootOrganizationToken(
    @Request() request: Express.Request
  ): Promise<AccessTokenResponse> {
    const userId = request.user?.user?.id;
    const organizationId = Organization.RootId;

    const accessToken =
      userId != null
        ? await this.orgService.createMemberAccessToken(userId, organizationId)
        : await this.orgService.createGuestAccessToken(organizationId);

    return {
      accessToken,
    };
  }

  @Public()
  @Post(':id/token')
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async getOrganizationToken(
    @Param('id') organizationId: string,
    @Request() request: Express.Request
  ): Promise<AccessTokenResponse> {
    const userId = request.user?.user?.id;

    const accessToken =
      userId != null
        ? await this.orgService.createMemberAccessToken(userId, organizationId)
        : await this.orgService.createGuestAccessToken(organizationId);

    return {
      accessToken,
    };
  }

  @Post(':id/invitation')
  @ApiCreatedResponse({ type: MemberInvitationToken })
  async createInvitation(
    @Param('id') organizationId: string,
    @Body() createInvitationRequest: CreateInvitationRequest,
    @Request() request: Express.Request
  ): Promise<MemberInvitationToken> {
    const member = request.user?.member;
    assert(member);
    const invite = await this.orgService.createInvitation(
      organizationId,
      member,
      createInvitationRequest.roles
    );
    return invite;
  }

  @Get('invitation/:token')
  @ApiOkResponse({ type: MemberInvitationToken })
  async getInvitation(
    @Param('token') token: string
  ): Promise<MemberInvitationToken | null> {
    const invite = await this.orgService.getInvitation(token);
    return invite;
  }

  @Post('invitation/:token/claim')
  @ApiCreatedResponse({ type: Member })
  async claimInvitation(
    @Param('token') token: string,
    @Request() request: Express.Request
  ): Promise<Member | null> {
    const userId = request.user?.user?.id;
    assert(userId);
    const member = await this.orgService.claimInvitation(userId, token);
    return member;
  }
}
