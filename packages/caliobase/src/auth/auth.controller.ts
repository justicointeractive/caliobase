import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { ApiBody, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { DataSource } from 'typeorm';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
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

export class AccessTokenResponse {
  @ApiProperty()
  accessToken!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private socialLoginRepo = this.dataSource.getRepository(UserSocialLogin);
  private userRepo = this.dataSource.getRepository(User);

  constructor(
    private dataSource: DataSource,
    private authService: AuthService
  ) {}

  @Public()
  @Post('social/validate')
  @ApiBody({ type: SocialValidateBody })
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

  @Get('me')
  async getMe(
    @Request() { user: { id } }: { user: { id: string } }
  ): Promise<User> {
    return await this.userRepo.findOneByOrFail({ id });
  }
}
