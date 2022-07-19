import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  Request,
  Type,
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
import { Type as TransformType } from 'class-transformer';
import { IsString, MinLength, ValidateNested } from 'class-validator';
import { RequestUser } from '../entity-module/RequestUser';
import { assert } from '../lib/assert';
import { getEntityDtos } from '../lib/getEntityDtos';
import { html } from '../lib/html';
import { CaliobaseAuthProfileEntities } from './auth.module';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Member } from './entities/member.entity';
import { User as UserEntity } from './entities/user.entity';
import { CaliobaseRequestUser } from './jwt.strategy';
import { OrganizationService } from './organization.service';
import {
  AbstractOrganizationProfile,
  AbstractUserProfile,
} from './profiles.service';

class CreatePasswordResetTokenBody {
  @IsString()
  @ApiProperty()
  email!: string;
}

class ResetWithTokenBody {
  @IsString()
  @ApiProperty()
  password!: string;

  @IsString()
  @ApiProperty()
  token!: string;
}

class UserLoginBody {
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

export abstract class AbstractAuthController {
  abstract createUserWithPassword(userDetails: any): any;
  abstract loginUser(body: UserLoginBody): any;
  abstract getMe(user: RequestUser): any;
}

export function createAuthController<
  TUser extends AbstractUserProfile,
  TOrganization extends AbstractOrganizationProfile
>({
  profileEntities: { UserProfile },
}: {
  profileEntities: CaliobaseAuthProfileEntities<TUser, TOrganization>;
}): Type<AbstractAuthController> {
  // #region Supporting Classes
  const { CreateEntityDto: CreateUserProfileEntityDto } = UserProfile
    ? getEntityDtos(UserProfile)
    : { CreateEntityDto: null };

  class SocialRequestBody {
    @IsString()
    // TODO: provide enum of installed providers
    @ApiProperty()
    provider!: string;
  }

  class SocialValidateBody extends SocialRequestBody {
    @IsString()
    @ApiProperty()
    accessToken!: string;
  }

  class UserSignupBody {
    @IsString()
    @ApiProperty()
    email!: string;

    @IsString()
    @ApiProperty()
    password!: string;

    profile!: AbstractUserProfile | null;
  }

  if (CreateUserProfileEntityDto) {
    Reflect.decorate(
      [
        ApiProperty({ type: CreateUserProfileEntityDto }),
        ValidateNested(),
        TransformType(() => CreateUserProfileEntityDto),
      ],
      UserSignupBody.prototype,
      'profile'
    );
  }

  class User extends UserEntity {}

  if (UserProfile) {
    Reflect.decorate(
      [ApiProperty({ type: UserProfile })],
      User.prototype,
      'profile'
    );
  }

  class AuthenticationResponse extends AccessTokenResponse {
    @ApiProperty()
    user!: User;
  }

  class SocialAuthenticationResponse extends AuthenticationResponse {}

  class SocialAuthUrlResponse {
    @ApiProperty()
    authUrl!: string;

    @ApiProperty()
    nonce!: string;
  }

  class UpdatePasswordBody {
    @ApiProperty()
    currentPassword!: string;

    @ApiProperty()
    newPassword!: string;
  }

  class UpdatePasswordResponse {
    @ApiProperty()
    success!: boolean;
  }
  // #endregion

  @ApiTags('auth')
  @Controller('auth')
  @ApiBearerAuth()
  class AuthController extends AbstractAuthController {
    constructor(
      private authService: AuthService,
      private orgService: OrganizationService
    ) {
      super();
    }

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
      `;
    }

    @Public()
    @Post('social/validate')
    @ApiBody({ type: SocialValidateBody })
    @ApiCreatedResponse({ type: SocialAuthenticationResponse })
    async socialValidate(
      @Body() body: SocialValidateBody
    ): Promise<SocialAuthenticationResponse> {
      const { user } = await this.authService.validateSocial(body);

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
    async getMe(
      @Request() { user }: RequestUser
    ): Promise<CaliobaseRequestUser> {
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
      await this.authService.setPasswordWithResetToken(
        body.token,
        body.password
      );

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

  return AuthController;
}
