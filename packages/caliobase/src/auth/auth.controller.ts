import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { DataSource } from 'typeorm';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { UserPasswordRepository } from './entities';
import { UserSocialLogin } from './entities/user-social-login.entity';
import { User } from './entities/user.entity';

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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly socialLoginRepo =
    this.dataSource.getRepository(UserSocialLogin);
  private readonly userRepo = this.dataSource.getRepository(User);
  private readonly userPasswordRepo = UserPasswordRepository.forDataSource(
    this.dataSource
  );

  constructor(
    private dataSource: DataSource,
    private authService: AuthService
  ) {}

  @Public()
  @Post('social/validate')
  @ApiBody({ type: SocialValidateBody })
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async socialValidate(
    @Body() body: SocialValidateBody
  ): Promise<AccessTokenResponse> {
    const profile = await this.authService.validate(body);

    const { providerUserId, provider, name, email } = profile;

    const socialLogin = await this.socialLoginRepo.findOne({
      where: {
        provider,
        providerUserId,
      },
      relations: ['user'],
    });

    let user = socialLogin?.user;

    if (user == null) {
      const { givenName, familyName } = name;
      user = await this.userRepo.save({
        email,
        givenName,
        familyName,
      });
      await this.socialLoginRepo.save({
        user,
        provider,
        providerUserId,
      });
    }

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
    const user = await this.userRepo.save({
      ...body,
    });

    await this.userPasswordRepo.setUserPassword(user, body.password);

    return {
      accessToken: await this.authService.sign({
        userId: user.id,
      }),
    };
  }

  @Public()
  @Post('user/login')
  @ApiBody({ type: UserSignupBody })
  @ApiCreatedResponse({ type: AccessTokenResponse })
  async loginUser(@Body() body: UserLoginBody) {
    const user = await this.userRepo.findOneOrFail({
      where: { email: body.email },
    });

    await this.userPasswordRepo.compareUserPassword(user, body.password);

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
    return await this.userRepo.findOneByOrFail({ id });
  }
}
