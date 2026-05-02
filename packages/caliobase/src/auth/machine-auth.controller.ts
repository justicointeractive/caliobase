import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Request,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role, Roles } from '../entity-module/roles';
import { Public } from './decorators/public.decorator';
import { ALLOWED_ROLES } from './decorators/role.decorator';
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

const RequireMachineTokenAdmin = (): PropertyDecorator =>
  SetMetadata(ALLOWED_ROLES, Roles.fromMiniumLevel('owner'));

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

type AuthenticatedRequest = { user: CaliobaseRequestUser };

@Controller('machine-auth')
@ApiTags('machine-auth')
export class MachineAuthController {
  constructor(private readonly machineAuthService: MachineAuthService) {}

  @Post('tokens')
  @RequireMachineTokenAdmin()
  @ApiBearerAuth()
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
  @RequireMachineTokenAdmin()
  @ApiBearerAuth()
  async listTokens(@Request() { user }: AuthenticatedRequest) {
    return this.machineAuthService.listMachineTokens(user);
  }

  @Delete('tokens/:id')
  @RequireMachineTokenAdmin()
  @ApiBearerAuth()
  async revokeToken(
    @Request() { user }: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    return this.machineAuthService.revokeMachineToken(user, id);
  }

  @Public()
  @Post('exchange')
  @ApiBearerAuth()
  async exchangeToken(
    @Headers('authorization') authorization: string | undefined
  ) {
    const token = extractMachineToken({ authorization });

    if (!token) {
      throw new UnauthorizedException('machine token required');
    }

    return this.machineAuthService.exchangeMachineToken(token);
  }
}
