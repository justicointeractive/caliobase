import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../entity-module/roles';
import { Public } from './decorators/public.decorator';
import { RequireRoleOrHigher } from './decorators/role.decorator';
import { CaliobaseRequestUser } from './jwt.strategy';
import {
  extractMachineToken,
  MachineAuthService,
} from './machine-auth.service';

const AllMachineTokenRoles = [
  'owner',
  'manager',
  'writer',
  'moderator',
  'guest',
];

class CreateMachineTokenDto {
  @IsString()
  @MinLength(1)
  @ApiProperty()
  name!: string;

  @IsOptional()
  @IsArray()
  @IsIn(AllMachineTokenRoles, { each: true })
  @ApiProperty({ enum: AllMachineTokenRoles, isArray: true, required: false })
  roles?: Role[];
}

class ExchangeMachineOidcTokenDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @ApiProperty({
    required: false,
    description:
      'OIDC JWT to exchange. If omitted, the Bearer token from the Authorization header is used.',
  })
  token?: string;
}

type AuthenticatedRequest = { user: CaliobaseRequestUser };

class MachineTokenSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  tokenPrefix!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: AllMachineTokenRoles, isArray: true })
  roles!: Role[];

  @ApiProperty()
  createdByUserId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  revokedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastUsedAt!: Date | null;
}

class CreateMachineTokenResponseDto {
  @ApiProperty()
  token!: string;

  @ApiProperty({ type: () => MachineTokenSummaryDto })
  machineAccessToken!: MachineTokenSummaryDto;
}

class ExchangeMachineTokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ enum: ['Bearer'] })
  tokenType!: 'Bearer';

  @ApiProperty()
  expiresIn!: number;

  @ApiProperty({ type: () => MachineTokenSummaryDto })
  machineAccessToken!: MachineTokenSummaryDto;
}

class MachineOidcIdentitySummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  issuer!: string;

  @ApiProperty()
  subject!: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  audience!: string | string[];

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  userId!: string;
}

class ExchangeMachineOidcTokenResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ enum: ['Bearer'] })
  tokenType!: 'Bearer';

  @ApiProperty()
  expiresIn!: number;

  @ApiProperty({ type: () => MachineOidcIdentitySummaryDto })
  machineIdentity!: MachineOidcIdentitySummaryDto;
}

@Controller('machine-auth')
@ApiTags('machine-auth')
export class MachineAuthController {
  constructor(private readonly machineAuthService: MachineAuthService) {}

  @Post('tokens')
  @RequireRoleOrHigher('owner')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: CreateMachineTokenResponseDto })
  async createToken(
    @Request() { user }: AuthenticatedRequest,
    @Body() body: CreateMachineTokenDto
  ) {
    return this.machineAuthService.createMachineToken(user, {
      name: body.name,
      roles: body.roles,
    });
  }

  @Get('tokens')
  @RequireRoleOrHigher('owner')
  @ApiBearerAuth()
  @ApiOkResponse({ type: [MachineTokenSummaryDto] })
  async listTokens(@Request() { user }: AuthenticatedRequest) {
    return this.machineAuthService.listMachineTokens(user);
  }

  @Delete('tokens/:id')
  @RequireRoleOrHigher('owner')
  @ApiBearerAuth()
  @ApiOkResponse({ type: MachineTokenSummaryDto })
  async revokeToken(
    @Request() { user }: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    return this.machineAuthService.revokeMachineToken(user, id);
  }

  @Public()
  @Post('exchange')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: ExchangeMachineTokenResponseDto })
  async exchangeToken(
    @Headers('authorization') authorization: string | undefined
  ) {
    const token = extractMachineToken({ authorization });

    if (!token) {
      throw new UnauthorizedException('machine token required');
    }

    return this.machineAuthService.exchangeMachineToken(token);
  }

  @Public()
  @Post('oidc/exchange')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: ExchangeMachineOidcTokenResponseDto })
  async exchangeOidcToken(
    @Body() body: ExchangeMachineOidcTokenDto | undefined,
    @Headers('authorization') authorization: string | undefined
  ) {
    const token = body?.token ?? extractMachineToken({ authorization });

    if (!token) {
      throw new UnauthorizedException('OIDC machine token required');
    }

    return this.machineAuthService.exchangeOidcToken(token);
  }
}
