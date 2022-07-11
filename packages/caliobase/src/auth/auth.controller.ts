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
import { IsString } from 'class-validator';
import { RequestUser } from '../entity-module/RequestUser';
import { assert } from '../lib/assert';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Member } from './entities/member.entity';
import { User } from './entities/user.entity';
import { OrganizationService } from './organization.service';

export class SocialValidateBody {
  @IsString()
  @ApiProperty()
  provider!: string;

  @IsString()
  @ApiProperty()
  accessToken!: string;
}

export class UserSignupBody {
  @IsString()
  @ApiProperty()
  givenName!: string;

  @IsString()
  @ApiProperty()
  familyName!: string;

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
  @ApiProperty()
  email!: string;

  @IsString()
  @ApiProperty()
  password!: string;
}

export class AccessTokenResponse {
  @ApiProperty()
  accessToken!: string;
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
  @Post('social/validate')
  @ApiBody({ type: SocialValidateBody })
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async socialValidate(
    @Body() body: SocialValidateBody
  ): Promise<AccessTokenResponse> {
    const user = await this.authService.validateSocial(body);

    return {
      accessToken: await this.authService.sign({
        userId: user.id,
      }),
    };
  }

  @Public()
  @Post('user/signup')
  @ApiBody({ type: UserSignupBody })
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async signupUser(@Body() body: UserSignupBody) {
    const user = await this.authService.createUserWithPassword(body);

    return {
      accessToken: await this.authService.sign({
        userId: user.id,
      }),
    };
  }

  @Public()
  @Post('user/login')
  @ApiBody({ type: UserLoginBody })
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async loginUser(@Body() body: UserLoginBody) {
    const user = await this.authService.validatePassword(body);

    return {
      accessToken: await this.authService.sign({
        userId: user.id,
      }),
    };
  }

  @Get('me')
  @ApiCreatedResponse({ type: User })
  async getMe(
    @Request() { user: { id } }: { user: { id: string } }
  ): Promise<User> {
    return await this.authService.getUserById({ userId: id });
  }

  @Patch('me/password')
  @ApiOkResponse({ type: UpdatePasswordResponse })
  async updatePassword(
    @Body() body: UpdatePasswordBody,
    @Request() { user: { id } }: { user: { id: string } }
  ): Promise<UpdatePasswordResponse> {
    await this.authService.setUserPassword(id, body);

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
