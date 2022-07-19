import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { async as cryptoRandomString } from 'crypto-random-string';
import { addHours } from 'date-fns';
import { DataSource, MoreThanOrEqual } from 'typeorm';
import { CaliobaseConfig } from '../config/config';
import { forgotPasswordEmail } from '../emails/forgotPasswordEmail';
import { assert } from '../lib/assert';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserPasswordRepository } from './entities/user-password.entity';
import { UserSocialLogin } from './entities/user-social-login.entity';
import { User } from './entities/user.entity';
import { CaliobaseJwtPayload } from './jwt-payload';
import {
  AbstractProfileService,
  AbstractUserProfile,
} from './profiles.service';
import {
  SocialProvider,
  SocialProvidersToken,
  SocialRequest,
  SocialValidation,
} from './social-provider/social-provider';

export type CreateUserRequest = {
  email: string;
  password: string;
  profile: Partial<AbstractUserProfile> | null;
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
    private profileService: AbstractProfileService,
    private dataSource: DataSource,
    private jwtService: JwtService
  ) {
    this.providers = new Map(
      socialProviders.map((provider) => [provider.name, provider])
    );
  }

  async getSocialAuthUrl(request: SocialRequest) {
    const socialProvider = this.providers.get(request.provider);

    if (socialProvider == null) {
      throw new Error(
        `no provider registered for social profile type ${request.provider}`
      );
    }

    if (socialProvider.createAuthorizationUrl == null) {
      throw new Error('selected provider does not offer auth url creation');
    }

    return await socialProvider.createAuthorizationUrl();
  }

  async validateSocial(request: SocialValidation) {
    const socialProvider = this.providers.get(request.provider);

    if (socialProvider == null) {
      throw new Error(
        `no provider registered for social profile type ${request.provider}`
      );
    }

    const socialProfile = await socialProvider.validate(request);

    const { providerUserId, provider, email, emailVerified } = socialProfile;

    const socialLogin = await this.socialLoginRepo.findOne({
      where: {
        provider,
        providerUserId,
      },
      relations: ['user'],
    });

    let user = socialLogin?.user;

    if (user == null) {
      const createProfile =
        this.profileService.socialProfileToUserProfile?.(socialProfile);

      user = await this.userRepo.save(
        this.userRepo.create({
          email,
          emailVerified,
        })
      );
      const profile =
        createProfile &&
        (await this.profileService.createUserProfile(user, createProfile));

      (user as any)!.profile = profile;

      // TODO hook in here or somewhere else to create org member (ie: Azure AD SSO)

      await this.socialLoginRepo.save(
        this.socialLoginRepo.create({
          user,
          provider,
          providerUserId,
        })
      );
    }

    return {
      user,
    };
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

  async createUserWithPassword({
    password,
    profile: createProfile,
    ...createUser
  }: CreateUserRequest): Promise<User & { profile: unknown }> {
    const user = await this.userRepo.save(
      this.userRepo.create({
        ...createUser,
      })
    );

    const profile =
      createProfile &&
      (await this.profileService.createUserProfile(user, createProfile));

    await this.userPasswordRepo.setUserPassword(user, password);

    return { ...user, profile };
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

        await this.passwordResetTokenRepo.save(
          this.passwordResetTokenRepo.create({
            user,
            token,
            validUntil: addHours(Date.now(), 1),
          })
        );

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
