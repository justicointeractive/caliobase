import {
  Body,
  Controller,
  Get,
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
import { IsString, MinLength } from 'class-validator';
import { RequestUser } from '../entity-module/RequestUser';
import { assert } from '../lib/assert';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Member } from './entities/member.entity';
import { User } from './entities/user.entity';
import { CaliobaseRequestUser } from './jwt.strategy';
import { OrganizationService } from './organization.service';

export class SocialRequestBody {
  @IsString()
  @ApiProperty()
  provider!: string;
}

export class SocialValidateBody extends SocialRequestBody {
  @IsString()
  @ApiProperty()
  accessToken!: string;
}

export class UserSignupBody {
  @IsString()
  @ApiProperty()
  email!: string;

  @IsString()
  @ApiProperty()
  password!: string;
}

export class CreatePasswordResetTokenBody {
  @IsString()
  @ApiProperty()
  email!: string;
}

export class ResetWithTokenBody {
  @IsString()
  @ApiProperty()
  password!: string;

  @IsString()
  @ApiProperty()
  token!: string;
}

export class UserLoginBody {
  @IsString()
  @MinLength(1)
  @ApiProperty()
  email!: string;

  @IsString()
  @MinLength(1)
  @ApiProperty()
  password!: string;
}

export class AccessTokenResponse {
  @ApiProperty()
  accessToken!: string;
}

export class AuthenticationResponse {
  @ApiProperty()
  user!: User;

  @ApiProperty()
  accessToken!: string;
}

export class SocialAuthUrlResponse {
  @ApiProperty()
  authUrl!: string;

  @ApiProperty()
  nonce!: string;
}

export class UpdatePasswordBody {
  @ApiProperty()
  currentPassword!: string;

  @ApiProperty()
  newPassword!: string;
}

export class UpdatePasswordResponse {
  @ApiProperty()
  success!: boolean;
}

@ApiTags('auth')
@Controller('auth')
@ApiBearerAuth()
export class AuthController {
  constructor(
    private authService: AuthService,
    private orgService: OrganizationService
  ) {}

  @Public()
  @Post('social/authUrl')
  @ApiBody({ type: SocialValidateBody })
  @ApiCreatedResponse({ type: SocialAuthUrlResponse })
  async socialAuthUrl(
    @Body() body: SocialValidateBody
  ): Promise<SocialAuthUrlResponse> {
    const authUrl = await this.authService.getSocialAuthUrl(body);
    return authUrl;
  }

  @Public()
  @Post('social/validate')
  @ApiBody({ type: SocialValidateBody })
  @ApiCreatedResponse({ type: AuthenticationResponse })
  async socialValidate(
    @Body() body: SocialValidateBody
  ): Promise<AuthenticationResponse> {
    const user = await this.authService.validateSocial(body);

    return {
      user,
      accessToken: await this.authService.sign({
        userId: user.id,
      }),
    };
  }

  @Public()
  @Post('user/create')
  @ApiBody({ type: UserSignupBody })
  @ApiCreatedResponse({ type: AuthenticationResponse })
  async createUserWithPassword(
    @Body()
    body: UserSignupBody
  ): Promise<AuthenticationResponse> {
    const user = await this.authService.createUserWithPassword(body);

    return {
      user,
      accessToken: await this.authService.sign({
        userId: user.id,
      }),
    };
  }

  @Public()
  @Post('user/login')
  @ApiBody({ type: UserLoginBody })
  @ApiCreatedResponse({ type: AuthenticationResponse })
  async loginUser(
    @Body()
    body: UserLoginBody
  ): Promise<AuthenticationResponse> {
    const user = await this.authService.validatePassword(body);

    return {
      user,
      accessToken: await this.authService.sign({
        userId: user.id,
      }),
    };
  }

  @Get('me')
  @ApiCreatedResponse({ type: CaliobaseRequestUser })
  async getMe(@Request() { user }: RequestUser): Promise<CaliobaseRequestUser> {
    assert(user);
    return user;
  }

  @Patch('me/password')
  @ApiOkResponse({ type: UpdatePasswordResponse })
  async updatePassword(
    @Body() body: UpdatePasswordBody,
    @Request() { user }: RequestUser
  ): Promise<UpdatePasswordResponse> {
    const userId = user?.user?.id;
    assert(userId);
    await this.authService.setUserPassword(userId, body);
    return { success: true };
  }

  @Public()
  @Post('user/password/emailResetToken')
  @ApiBody({ type: CreatePasswordResetTokenBody })
  @ApiOkResponse()
  async emailResetToken(@Body() body: CreatePasswordResetTokenBody) {
    await this.authService.createAndEmailPasswordResetLink(body.email);

    return {
      success: true,
    };
  }

  @Public()
  @Post('user/password/resetWithToken')
  @ApiBody({ type: ResetWithTokenBody })
  @ApiOkResponse()
  async resetWithToken(@Body() body: ResetWithTokenBody) {
    await this.authService.setPasswordWithResetToken(body.token, body.password);

    return {
      success: true,
    };
  }

  @Get()
  @ApiOkResponse({ type: [Member] })
  async listUserMemberships(@Request() request: RequestUser) {
    const userId = request.user?.user?.id;
    assert(userId, UnauthorizedException);
    return await this.orgService.findUserMemberships(userId);
  }
}
