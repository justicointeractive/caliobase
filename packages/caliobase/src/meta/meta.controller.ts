import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { DataSource } from 'typeorm';
import {
  CreateOrganizationBody,
  Member,
  Organization,
  Public,
  UserSignupBody,
} from '../auth';
import { MetaService } from './meta.service';

class CreateRoot {
  @ValidateNested()
  @Type(() => UserSignupBody)
  user!: UserSignupBody;

  @ValidateNested()
  @Type(() => CreateOrganizationBody)
  organization!: CreateOrganizationBody;
}

class GetMetaResponse {
  @ApiProperty()
  hasRootMember!: boolean;

  @ApiProperty()
  publicOrgId!: string;

  @ApiProperty()
  rootOrgId!: string;
}

@ApiTags('meta')
@Controller('meta')
export class MetaController {
  private readonly memberRepo = this.dataSource.getRepository(Member);
  private readonly orgRepo = this.dataSource.getRepository(Organization);

  constructor(
    private dataSource: DataSource,
    private metaService: MetaService
  ) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: GetMetaResponse })
  async getMeta() {
    return <GetMetaResponse>{
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
    return this.metaService.createRoot(body);
  }
}
