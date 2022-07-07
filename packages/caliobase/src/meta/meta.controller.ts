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
import {
  CreateOrganizationBody,
  Member,
  Organization,
  UserSignupBody,
} from '../auth';
import { Public } from '../auth/decorators/public.decorator';
import { MetaService } from './meta.service';

class CreateRoot {
  @ValidateNested()
  @Type(() => UserSignupBody)
  @ApiProperty()
  user!: UserSignupBody;

  @ValidateNested()
  @Type(() => CreateOrganizationBody)
  @ApiProperty()
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
  constructor(private metaService: MetaService) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: GetMetaResponse })
  async getMeta() {
    return <GetMetaResponse>{
      hasRootMember: await this.metaService.getHasRootMember(),
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
