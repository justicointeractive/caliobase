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
import { async as cryptoRandomString } from 'crypto-random-string';
import { addDays } from 'date-fns';
import { DataSource } from 'typeorm';
import { Public, User } from '.';
import { AccessTokenResponse } from './auth.controller';
import { AuthService } from './auth.service';
import { MemberInvitationToken } from './entities/member-invitation-token.entity';
import { Member } from './entities/member.entity';
import { Organization } from './entities/organization.entity';

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

  @Get()
  @ApiOkResponse({ type: [Member] })
  async findAll(@Request() request: Express.Request) {
    return await this.memberRepo.find({
      where: {
        userId: request.user?.userId,
      },
      relations: ['organization'],
    });
  }

  @Post()
  @ApiCreatedResponse({ type: Member })
  @ApiBody({ type: CreateOrganizationBody })
  async create(
    @Body() body: CreateOrganizationBody,
    @Request() request: Express.Request
  ) {
    const organization = await this.orgRepo.save({ ...body });

    await this.memberRepo.save({
      userId: request.user?.userId,
      organization,
    });

    return organization;
  }

  @Post(':id/token')
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async getOrganizationToken(
    @Param('id') organizationId: string,
    @Request() request: Express.Request
  ): Promise<AccessTokenResponse> {
    const member = await this.memberRepo.findOneOrFail({
      where: {
        userId: request.user?.userId,
        organizationId,
      },
      relations: ['user', 'organization'],
    });

    return {
      accessToken: await this.authService.sign({
        userId: member.userId,
        organizationId: member.organizationId,
      }),
    };
  }

  @Public()
  @Post('token/public')
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async getPublicAccessToken(
    @Request() request: Express.Request
  ): Promise<AccessTokenResponse> {
    return {
      accessToken: await this.authService.sign({
        organizationId: Organization.PublicId,
        userId: request.user?.userId,
        onBehalfOfOrganizationId: request.user?.organizationId,
      }),
    };
  }

  @Post(':id/invitation')
  @ApiCreatedResponse({ type: MemberInvitationToken })
  async createInvitation(
    @Param('id') organizationId: string
  ): Promise<MemberInvitationToken> {
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

  @Get('invitation/:token')
  @ApiOkResponse({ type: MemberInvitationToken })
  async getInvitation(
    @Param('token') token: string
  ): Promise<MemberInvitationToken | null> {
    const invite = await this.memberInviteRepo.findOne({
      where: { token },
    });
    return invite;
  }

  @Post('invitation/:token/claim')
  @ApiCreatedResponse({ type: Member })
  async claimInvitation(
    @Param('token') token: string,
    @Request() request: Express.Request
  ): Promise<Member | null> {
    const { organization } = await this.memberInviteRepo.findOneOrFail({
      where: { token },
      relations: ['organization'],
    });
    const user = await this.userRepo.findOneOrFail({
      where: { id: request.user!.userId },
    });

    const member = await this.memberRepo.save({ user, organization });

    return member;
  }
}
