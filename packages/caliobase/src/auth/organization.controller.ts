/* eslint-disable @typescript-eslint/no-namespace */
import { Controller, Get, Param, Post, Request } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { getRepository } from 'typeorm';

import { AccessTokenResponse } from './auth.controller';
import { AuthService } from './auth.service';
import { Member } from './entities/member.entity';
import { Organization } from './entities/organization.entity';

import { Public } from '.';

@ApiTags('organization')
@Controller('organization')
export class OrganizationController {
  constructor(private authService: AuthService) {}

  @Get()
  async findAll(@Request() request: Express.Request) {
    return await getRepository(Member).find({
      where: {
        userId: request.user?.userId,
      },
      relations: ['organization'],
    });
  }

  @Post()
  async create(@Request() request: Express.Request) {
    const organization = await getRepository(Organization).save({});

    await getRepository(Member).save({
      userId: request.user?.userId,
      organization,
    });

    return organization;
  }

  @Post(':id/token')
  async getOrganizationToken(
    @Param('id') organizationId: string,
    @Request() request: Express.Request
  ): Promise<AccessTokenResponse> {
    const member = await getRepository(Member).findOneOrFail({
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
