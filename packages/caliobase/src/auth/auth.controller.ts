import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Patch,
  Post,
  Query,
  Request,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Type as TransformType } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RequestUser } from '../entity-module/RequestUser';
import { assert } from '../lib/assert';
import { getEntityDtos } from '../lib/getEntityDtos';
import { html } from '../lib/html';
import { CaliobaseAuthProfileEntities } from './auth.module';
import { AuthService, CreateUserRequest } from './auth.service';
import { Public } from './decorators/public.decorator';
import { AbstractOrganizationProfile } from './entities/abstract-organization-profile.entity';
import { AbstractUserProfile } from './entities/abstract-user-profile.entity';
import { Member } from './entities/member.entity';
import { User, User as UserEntity } from './entities/user.entity';
import { JwtSignerService } from './jwt-signer.service';
import { CaliobaseRequestUser } from './jwt.strategy';
import { OrganizationService } from './organization.service';
import {
  SocialProfile,
  SocialProvider,
  SocialValidation,
} from './social-provider';

class CreatePasswordResetTokenBody {
  @IsString()
  @ApiProperty()
  email!: string;
}

export class ResetWithTokenBody {
  @IsString()
  @ApiProperty()
  @MinLength(1)
  password!: string;

  @IsString()
  @ApiProperty()
  @MinLength(1)
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

class OtpRequest {
  @IsString()
  @ApiProperty()
  email!: string;
}

class UserLoginWithOtpBody {
  @IsString()
  @MinLength(1)
  @ApiProperty()
  email!: string;

  @IsString()
  @MinLength(1)
  @ApiProperty()
  otp!: string;
}

export class AccessTokenResponse {
  @ApiProperty()
  accessToken!: string;
}

export type AccessTokenUserResponse<
  TUserProfile extends AbstractUserProfile = AbstractUserProfile
> = AccessTokenResponse & {
  user: User<TUserProfile>;
};

export abstract class AbstractAuthController<
  TUserProfile extends AbstractUserProfile = AbstractUserProfile
> {
  abstract userExistsWithEmail(email: string): Promise<boolean>;
  abstract createUserWithPassword(userDetails: {
    email: string;
    password: string;
    profile: Omit<TUserProfile, 'user' | 'userId'> | null;
  }): Promise<AccessTokenUserResponse>;
  abstract createUserWithoutPassword(userDetails: {
    email: string;
    profile: Omit<TUserProfile, 'user' | 'userId'> | null;
  }): Promise<AccessTokenUserResponse>;
  abstract emailResetToken(body: CreatePasswordResetTokenBody): Promise<{
    success: boolean;
  }>;
  abstract resetWithToken(body: ResetWithTokenBody): Promise<{
    success: boolean;
  }>;
  abstract loginUser(body: UserLoginBody): Promise<AccessTokenUserResponse>;
  abstract loginUserWithOtp(
    body: UserLoginWithOtpBody
  ): Promise<AccessTokenUserResponse>;
  abstract sendOtpByEmail(request: OtpRequest): Promise<void>;
  abstract getMe(user: RequestUser): Promise<CaliobaseRequestUser>;
}

export function createAuthController<
  TUserProfile extends AbstractUserProfile,
  TOrganization extends AbstractOrganizationProfile
>({
  profileEntities: { UserProfile },
  socialProviders,
}: {
  profileEntities: CaliobaseAuthProfileEntities<TUserProfile, TOrganization>;
  socialProviders: SocialProvider[];
}): Type<AbstractAuthController> & {
  CreateUserRequest: Type<CreateUserRequest>;
} {
  // #region Supporting Classes
  const { CreateEntityDto: CreateUserProfileEntityDto } = UserProfile
    ? getEntityDtos(UserProfile)
    : { CreateEntityDto: null };

  class SocialRequestBody {
    @IsString()
    @ApiProperty({
      type: String,
      enum: socialProviders.map((p) => p.name),
      enumName: 'SocialProviderName',
    })
    provider!: string;
  }

  class SocialValidateBody
    extends SocialRequestBody
    implements SocialValidation
  {
    @IsOptional()
    @IsString()
    @ApiPropertyOptional()
    idToken?: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional()
    accessToken?: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional()
    nonce?: string;
  }

  class UserWithoutPasswordSignupBody {
    @IsString()
    @ApiProperty()
    email!: string;

    profile!: Omit<TUserProfile, 'user' | 'userId'> | null;
  }

  Reflect.decorate(
    [
      ApiProperty({ type: CreateUserProfileEntityDto ?? Object }),
      ValidateNested(),
      TransformType(() => CreateUserProfileEntityDto ?? Object),
    ],
    UserWithoutPasswordSignupBody.prototype,
    'profile'
  );

  class UserSignupBody extends UserWithoutPasswordSignupBody {
    @IsString()
    @MinLength(1)
    @ApiProperty()
    password!: string;
  }

  class User extends UserEntity {}

  Reflect.decorate(
    [ApiProperty({ type: UserProfile ?? Object })],
    User.prototype,
    'profile'
  );

  class AuthenticationResponse extends AccessTokenResponse {
    @ApiProperty()
    user!: User;
  }

  class SocialAuthenticationResponse extends AuthenticationResponse {
    @ApiProperty()
    socialProfile!: SocialProfile;

    @ApiProperty()
    providerTokenClaims!: Record<string, unknown>;
  }

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
    static CreateUserRequest = UserSignupBody;

    constructor(
      private authService: AuthService,
      private jwtSigner: JwtSignerService,
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
          window.opener.postMessage(
            { type: data.error ? 'reject' : 'resolve', data },
            '*' // TODO shouldn't send the token to '*'
          );
        </script>
      `;
    }

    @Public()
    @Post('social/authUrl/return')
    @ApiOkResponse()
    @Header('Content-Type', 'text/html')
    async socialAuthUrlReturnPost(@Body() body: unknown): Promise<string> {
      return html`
        <!DOCTYPE html>
        <script>
          var data = ${JSON.stringify(body)};
          window.opener.postMessage(
            { type: data.error ? 'reject' : 'resolve', data },
            '*' // TODO shouldn't send the token to '*'
          );
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
      const { user, validationResult } = await this.authService.validateSocial(
        body
      );

      return {
        ...validationResult,
        user,
        accessToken: await this.jwtSigner.sign({
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
        accessToken: await this.jwtSigner.sign({
          userId: user.id,
        }),
      };
    }

    @Public()
    @Get('user/existsWithEmail')
    @ApiQuery({ name: 'email', type: String })
    @ApiOkResponse({ type: Boolean })
    async userExistsWithEmail(@Query('email') email: string): Promise<boolean> {
      return await this.authService.userExistsWithEmail(email);
    }

    @Public()
    @Post('user/createWithoutPassword')
    @ApiBody({ type: UserWithoutPasswordSignupBody })
    @ApiCreatedResponse({ type: AuthenticationResponse })
    async createUserWithoutPassword(
      @Body()
      body: UserWithoutPasswordSignupBody
    ): Promise<AuthenticationResponse> {
      const user = await this.authService.createUserWithoutPassword(body);

      return {
        user,
        accessToken: await this.jwtSigner.sign({
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
        accessToken: await this.jwtSigner.sign({
          userId: user.id,
        }),
      };
    }

    @Public()
    @Post('user/sendOtpByEmail')
    @ApiBody({ type: OtpRequest })
    @ApiOkResponse()
    async sendOtpByEmail(@Body() body: OtpRequest) {
      await this.authService.sendOtpByEmail(body.email);
    }

    @Public()
    @Post('user/loginWithOtp')
    @ApiBody({ type: UserLoginWithOtpBody })
    @ApiCreatedResponse({ type: AuthenticationResponse })
    async loginUserWithOtp(
      @Body()
      body: UserLoginWithOtpBody
    ): Promise<AuthenticationResponse> {
      const user = await this.authService.validateOtp(body);

      return {
        user,
        accessToken: await this.jwtSigner.sign({
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

    @Delete('me')
    @ApiNoContentResponse()
    async deleteMe(@Request() request: RequestUser) {
      const user = request.user?.user;
      assert(user);
      await this.authService.deleteUser(user);
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

    @Get('me/memberships')
    @ApiOkResponse({ type: [Member] })
    async listUserMemberships(@Request() request: RequestUser) {
      const userId = request.user?.user?.id;
      assert(userId, UnauthorizedException);
      return await this.orgService.findUserMemberships(userId);
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
  }

  return AuthController;
}
