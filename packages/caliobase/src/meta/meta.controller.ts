import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { DataSource } from 'typeorm';
import { AuthService, Member, Organization, Public, User } from '../auth';
import { MetaService } from './meta.service';

class CreateRoot {
  @IsString()
  @ApiProperty()
  orgName!: string;

  @IsString()
  @ApiProperty()
  userEmail!: string;

  @IsString()
  @ApiProperty()
  userGivenName!: string;

  @IsString()
  @ApiProperty()
  userFamilyName!: string;

  @IsString()
  @ApiProperty()
  userPassword!: string;
}

class GetMetaResponse {
  @ApiProperty()
  hasRootMember!: boolean;

  @ApiProperty()
  publicOrgId!: boolean;

  @ApiProperty()
  rootOrgId!: boolean;
}

@ApiTags('meta')
@Controller('meta')
export class MetaController {
  private readonly memberRepo = this.dataSource.getRepository(Member);
  private readonly orgRepo = this.dataSource.getRepository(Organization);

  constructor(
    private dataSource: DataSource,
    private metaService: MetaService,
    private authService: AuthService
  ) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: GetMetaResponse })
  async getMeta() {
    return {
      hasRootMember: await this.metaService.getHasRootMember(),
      publicOrgId: Organization.PublicId,
      rootOrgId: Organization.RootId,
    };
  }

  @Public()
  @Post()
  @ApiBody({ type: CreateRoot })
  @ApiCreatedResponse({ type: Member })
  async createRoot(@Body() body: CreateRoot) {
    await this.metaService.assertHasNoRootMember();

    const user: User = await this.authService.createUserWithPassword({
      email: body.userEmail,
      password: body.userPassword,
      givenName: body.userGivenName,
      familyName: body.userFamilyName,
    });

    const organization: Organization = await this.orgRepo.save({
      id: Organization.RootId,
      name: body.orgName,
    });

    const member: Member = await this.memberRepo.save({ user, organization });

    return member;
  }
}
