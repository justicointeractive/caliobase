/* eslint-disable @typescript-eslint/no-namespace */
import { Controller, Get, Param, Post, Request } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AccessTokenResponse } from './auth.controller';
import { AuthService } from './auth.service';
import { Member } from './entities/member.entity';
import { Organization } from './entities/organization.entity';

import { DataSource } from 'typeorm';
import { Public } from '.';

@ApiTags('organization')
@Controller('organization')
export class OrganizationController {
  private readonly memberRepo = this.dataSource.getRepository(Member);
  private readonly orgRepo = this.dataSource.getRepository(Organization);

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
  async create(@Request() request: Express.Request) {
    const organization = await this.orgRepo.save({});

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
}
