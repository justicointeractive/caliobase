import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { async as cryptoRandomString } from 'crypto-random-string';
import { addHours } from 'date-fns';
import { DataSource, MoreThanOrEqual } from 'typeorm';
import { CaliobaseConfig } from '../config/config';
import { forgotPasswordEmail } from '../emails/forgotPasswordEmail';
import { assert } from '../lib/assert';
import { User, UserPasswordRepository, UserSocialLogin } from './entities';
import { PasswordResetToken } from './entities/password-reset-token.entity';

import { CaliobaseJwtPayload } from './jwt-payload';
import {
  SocialProvider,
  SocialProvidersToken,
  SocialValidation,
} from './social-provider/social-provider';

export type CreateUserRequest = {
  email: string;
  password: string;
};

@Injectable()
export class AuthService {
  providers: Map<string, SocialProvider>;

  private readonly socialLoginRepo =
    this.dataSource.getRepository(UserSocialLogin);
  private readonly userRepo = this.dataSource.getRepository(User);
  private readonly userPasswordRepo = UserPasswordRepository.forDataSource(
    this.dataSource
  );
  private readonly passwordResetTokenRepo =
    this.dataSource.getRepository(PasswordResetToken);

  constructor(
    @Inject(SocialProvidersToken) socialProviders: SocialProvider[],
    @Inject(CaliobaseConfig) private config: CaliobaseConfig,
    private dataSource: DataSource,
    private jwtService: JwtService
  ) {
    this.providers = new Map(
      socialProviders.map((provider) => [provider.name, provider])
    );
  }

  async validateSocial(request: SocialValidation) {
    const socialProvider = this.providers.get(request.provider);

    if (socialProvider == null) {
      throw new Error(
        `no provider registered for social profile type ${request.provider}`
      );
    }

    const profile = await socialProvider.validate(request);

    const { providerUserId, provider, email } = profile;

    const socialLogin = await this.socialLoginRepo.findOne({
      where: {
        provider,
        providerUserId,
      },
      relations: ['user'],
    });

    let user = socialLogin?.user;

    if (user == null) {
      user = await this.userRepo.save({
        email,
      });
      await this.socialLoginRepo.save({
        user,
        provider,
        providerUserId,
      });
    }

    return user;
  }

  async validatePassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    if (!email || !password) {
      throw new BadRequestException('email and password required');
    }

    const user = await this.userRepo.findOne({
      where: { email },
    });

    await this.userPasswordRepo.assertCurrentPassword(user, password);

    assert(user);

    return user;
  }

  async createUserWithPassword({ password, ...createUser }: CreateUserRequest) {
    const user = await this.userRepo.save({
      ...createUser,
    });

    await this.userPasswordRepo.setUserPassword(user, password);

    return user;
  }

  async getUserById(request: { userId: string }) {
    return await this.userRepo.findOneByOrFail({ id: request.userId });
  }

  async setUserPassword(
    id: string,
    {
      currentPassword,
      newPassword,
    }: { currentPassword: string; newPassword: string }
  ) {
    const user = await this.userRepo.findOneByOrFail({ id });

    await this.userPasswordRepo.assertCurrentPassword(user, currentPassword);

    await this.userPasswordRepo.setUserPassword(user, newPassword);
  }

  async createAndEmailPasswordResetLink(userEmail: string) {
    const user = await this.userRepo.findOne({
      where: { email: userEmail },
    });

    const html = await (async () => {
      if (user) {
        const token = await cryptoRandomString({
          length: 128,
          type: 'url-safe',
        });

        await this.passwordResetTokenRepo.save({
          user,
          token,
          validUntil: addHours(Date.now(), 1),
        });

        const html = forgotPasswordEmail({
          accountExists: true,
          resetUrl: `${this.config.baseUrl}/?forgotPasswordToken=${token}`,
        });

        return html;
      }

      return forgotPasswordEmail({
        accountExists: false,
      });
    })();

    await this.config.emailTransport.sendMail({
      to: userEmail,
      subject: `Password Reset Request`,
      html,
    });
  }

  async setPasswordWithResetToken(resetToken: string, newPassword: string) {
    const token = await this.passwordResetTokenRepo.findOneOrFail({
      where: {
        token: resetToken,
        validUntil: MoreThanOrEqual(new Date()),
      },
    });

    await this.userPasswordRepo.setUserPassword(token.user, newPassword);

    token.validUntil = new Date();
    await this.passwordResetTokenRepo.save(token);

    return { success: true };
  }

  async sign(payload: CaliobaseJwtPayload) {
    return await this.jwtService.signAsync(payload);
  }
}
