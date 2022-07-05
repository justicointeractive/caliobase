import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Public } from '.';
import { AccessTokenResponse } from './auth.controller';
import { MemberInvitationToken } from './entities/member-invitation-token.entity';
import { Member } from './entities/member.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationService } from './organization.service';
import assert = require('assert');

export class CreateOrganizationBody {
  @ApiProperty()
  @IsString()
  @IsOptional()
  name?: string;
}

@ApiTags('organization')
@Controller('organization')
@ApiBearerAuth()
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  @Get()
  @ApiOkResponse({ type: [Member] })
  async findAll(@Request() request: Express.Request) {
    const userId = request.user?.userId;
    assert(userId);
    return await this.orgService.findUserMemberships(userId);
  }

  @Post()
  @ApiCreatedResponse({ type: Organization })
  @ApiBody({ type: CreateOrganizationBody })
  async create(
    @Body() body: CreateOrganizationBody,
    @Request() request: Express.Request
  ) {
    const userId = request.user?.userId;
    assert(userId);
    return this.orgService.createOrganization(userId, body);
  }

  @Post(':id/token')
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async getOrganizationToken(
    @Param('id') organizationId: string,
    @Request() request: Express.Request
  ): Promise<AccessTokenResponse> {
    const userId = request.user?.userId;
    assert(userId);
    const accessToken = await this.orgService.createMemberAccessToken(
      userId,
      organizationId
    );

    return {
      accessToken,
    };
  }

  @Public()
  @Post('token/public')
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async getPublicAccessToken(
    @Request() request: Express.Request
  ): Promise<AccessTokenResponse> {
    const accessToken = await this.orgService.createPublicAccessToken(
      request.user?.userId,
      request.user?.organizationId
    );
    return {
      accessToken,
    };
  }

  @Post(':id/invitation')
  @ApiCreatedResponse({ type: MemberInvitationToken })
  async createInvitation(
    @Param('id') organizationId: string
  ): Promise<MemberInvitationToken> {
    const invite = await this.orgService.createInvitation(organizationId);
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
    const userId = request.user?.userId;
    assert(userId);
    const member = await this.orgService.claimInvitation(userId, token);
    return member;
  }
}
