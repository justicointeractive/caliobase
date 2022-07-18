import {
  Body,
  Controller,
  Get,
  Header,
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
import { html } from '../lib/html';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Member } from './entities/member.entity';
import { User } from './entities/user.entity';
import { CaliobaseRequestUser } from './jwt.strategy';
import { OrganizationService } from './organization.service';
import { SocialProfile } from './social-provider';

export class SocialRequestBody {
  @IsString()
  // TODO: provide enum of installed providers
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

export class SocialAuthenticationResponse extends AuthenticationResponse {
  @ApiProperty()
  profile!: SocialProfile;
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
  @ApiBody({ type: SocialRequestBody })
  @ApiCreatedResponse({ type: SocialAuthUrlResponse })
  async socialAuthUrl(
    @Body() body: SocialRequestBody
  ): Promise<SocialAuthUrlResponse> {
    const authUrl = await this.authService.getSocialAuthUrl(body);
    return authUrl;
  }

  @Public()
  @Get('social/authUrl/return')
  @ApiOkResponse()
  @Header('Content-Type', 'text/html')
  async socialAuthUrlReturn(): Promise<string> {
    return html`
      <!DOCTYPE html>
      <head>
        <script>
          var data = {};
          new URLSearchParams(
            [location.search, location.hash]
              .map((str) => str.substring(1))
              .join('&')
          ).forEach((value, key) => {
            data[key] = value;
          });
          // TODO shouldn't send the token to '*'
          window.opener.postMessage({ type: 'resolve', data: data }, '*');
        </script>
      </head>
    `;
  }

  @Public()
  @Post('social/validate')
  @ApiBody({ type: SocialValidateBody })
  @ApiCreatedResponse({ type: SocialAuthenticationResponse })
  async socialValidate(
    @Body() body: SocialValidateBody
  ): Promise<SocialAuthenticationResponse> {
    const { user, profile } = await this.authService.validateSocial(body);

    return {
      user,
      profile,
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
