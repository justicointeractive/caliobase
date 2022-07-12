import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Member, Organization } from '../auth';
import { Public } from '../auth/decorators/public.decorator';
import { AllRoles, Role } from '../entity-module/roles';
import { CreateRootRequest } from './CreateRootRequest';
import { MetaService } from './meta.service';

class GetMetaResponse {
  @ApiProperty()
  hasRootMember!: boolean;

  @ApiProperty()
  publicOrgId!: string;

  @ApiProperty()
  rootOrgId!: string;

  @ApiProperty()
  allRoles!: Role[];
}

@ApiTags('meta')
@Controller('meta')
export class MetaController {
  constructor(private metaService: MetaService) {}

  @Public()
  @Get()
  @ApiOkResponse({ type: () => GetMetaResponse })
  async getMeta() {
    return <GetMetaResponse>{
      hasRootMember: await this.metaService.getHasRootMember(),
      rootOrgId: Organization.RootId,
      allRoles: AllRoles,
    };
  }

  @Public()
  @Post()
  @ApiBody({ type: () => CreateRootRequest })
  @ApiCreatedResponse({ type: Member })
  async createRoot(@Body() body: CreateRootRequest) {
    return this.metaService.createRoot(body);
  }
}
