import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { async as cryptoRandomString } from 'crypto-random-string';
import { addHours } from 'date-fns';
import { DataSource, MoreThanOrEqual } from 'typeorm';
import { CaliobaseConfig, formatWithToken } from '../config/config';
import { forgotPasswordEmail } from '../emails/forgotPasswordEmail';
import { assert } from '../lib/assert';
import { AbstractUserProfile } from './entities/abstract-user-profile.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserPasswordRepository } from './entities/user-password.entity';
import { UserSocialLogin } from './entities/user-social-login.entity';
import { User } from './entities/user.entity';
import { OrganizationService } from './organization.service';
import { AbstractProfileService } from './profiles.service';
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
    private orgService: OrganizationService,
    private profileService: AbstractProfileService,
    private dataSource: DataSource
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

    const validationResult = await socialProvider.validate(request);
    const mappedToMembership = await socialProvider.mapToMembership?.(
      validationResult
    );

    const { providerUserId, provider, email, emailVerified } =
      validationResult.profile;

    const socialLogin = await this.socialLoginRepo.findOne({
      where: {
        provider,
        providerUserId,
      },
      relations: ['user'],
    });

    let user = socialLogin?.user;

    if (user == null) {
      const createProfile = this.profileService.socialProfileToUserProfile?.(
        validationResult.profile
      );

      user = await this.userRepo.save(
        this.userRepo.create({
          email,
          emailVerified,
        })
      );

      user.profile =
        (createProfile &&
          (await this.profileService.createUserProfile(user, createProfile))) ||
        undefined;

      await this.socialLoginRepo.save(
        this.socialLoginRepo.create({
          user,
          provider,
          providerUserId,
        })
      );
    }

    if (mappedToMembership != null) {
      await this.orgService.administrativelyAddMember(
        { id: mappedToMembership.organizationId },
        user,
        mappedToMembership.role
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
      (createProfile &&
        (await this.profileService.createUserProfile(user, createProfile))) ||
      undefined;

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
          resetUrl: formatWithToken(this.config.urls.forgotPassword, token),
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
}
