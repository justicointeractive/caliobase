import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { RequestUser } from '../entity-module/RequestUser';
import { AllRoles, Role } from '../entity-module/roles';
import { assert } from '../lib/assert';
import { AccessTokenResponse } from './auth.controller';
import { CreateOrganizationRequest } from './CreateOrganizationRequest';
import { Public } from './decorators/public.decorator';
import { MemberInvitationToken } from './entities/member-invitation-token.entity';
import { Member } from './entities/member.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationService } from './organization.service';

class CreateInvitationRequest {
  @ApiProperty()
  @IsIn(AllRoles)
  roles!: Role[];
}

@ApiTags('organization')
@Controller('organization')
@ApiBearerAuth()
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  @Post()
  @ApiCreatedResponse({ type: Organization })
  @ApiBody({ type: CreateOrganizationRequest })
  async create(
    @Body() body: CreateOrganizationRequest,
    @Request() request: RequestUser
  ) {
    const userId = request.user?.user?.id;
    assert(userId, UnauthorizedException);
    const org = this.orgService.createOrganization(userId, body);
    // TODO hook here to create org profile
    return org;
  }

  @Public()
  @Post('token')
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async getRootOrganizationToken(
    @Request() request: RequestUser
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
    @Request() request: RequestUser
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

  @Post('invitation')
  @ApiCreatedResponse({ type: MemberInvitationToken })
  @ApiBody({ type: CreateInvitationRequest })
  async createInvitation(
    @Body() createInvitationRequest: CreateInvitationRequest,
    @Request() request: RequestUser
  ): Promise<MemberInvitationToken> {
    const member = request.user?.member;
    assert(member, UnauthorizedException);
    const invite = await this.orgService.createInvitation(
      member,
      createInvitationRequest.roles
    );
    return invite;
  }

  @Public()
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
    @Request() request: RequestUser
  ): Promise<Member | null> {
    const userId = request.user?.user?.id;
    assert(userId, UnauthorizedException);
    const member = await this.orgService.claimInvitation(userId, token);
    return member;
  }

  @Get('member')
  @ApiOkResponse({ type: [Member] })
  async listMembers(@Request() request: RequestUser) {
    const orgId = request.user?.organization?.id;
    assert(orgId, UnauthorizedException);
    return await this.orgService.findOrganizationMembers(orgId);
  }

  @Get('member/:userId')
  @ApiOkResponse({ type: Member })
  async getMember(
    @Param('userId') targetUserId: string,
    @Request() request: RequestUser
  ): Promise<Member | null> {
    const actingMember = request.user?.member;
    assert(actingMember, UnauthorizedException);
    const targetMember = await this.orgService.getMember(
      targetUserId,
      actingMember.organizationId
    );
    return targetMember;
  }

  @Patch('member/:userId')
  @ApiOkResponse({ type: Member })
  @ApiBody({ type: CreateInvitationRequest })
  async updateMember(
    @Param('userId') targetUserId: string,
    @Request() request: RequestUser,
    @Body() updateRequest: CreateInvitationRequest
  ): Promise<Member | null> {
    const actingMember = request.user?.member;
    assert(actingMember, UnauthorizedException);
    const targetMember = await this.orgService.getMember(
      targetUserId,
      actingMember.organizationId
    );
    assert(targetMember, NotFoundException);
    return await this.orgService.updateMember(
      actingMember,
      targetMember,
      updateRequest
    );
  }

  @Delete('member/:userId')
  @ApiOkResponse({ type: Member })
  async removeMember(
    @Param('userId') targetUserId: string,
    @Request() request: RequestUser
  ): Promise<Member | null> {
    const actingMember = request.user?.member;
    assert(actingMember, UnauthorizedException);
    const targetMember = await this.orgService.getMember(
      targetUserId,
      actingMember.organizationId
    );
    assert(targetMember, NotFoundException);
    return await this.orgService.removeMember(actingMember, targetMember);
  }
}
