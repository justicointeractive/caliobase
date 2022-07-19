import { DynamicModule, Module, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { nonNull } from 'circumspect';
import {
  AbstractAuthController,
  createAuthController,
} from './auth.controller';
import { AuthService } from './auth.service';
import { MemberInvitationToken } from './entities/member-invitation-token.entity';
import { Member } from './entities/member.entity';
import { Organization } from './entities/organization.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserPassword } from './entities/user-password.entity';
import { UserSocialLogin } from './entities/user-social-login.entity';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt.guard';
import { JwtStrategy } from './jwt.strategy';
import {
  AbstractOrganizationController,
  createOrganizationController,
} from './organization.controller';
import { OrganizationService } from './organization.service';
import {
  AbstractOrganizationProfile,
  AbstractProfileService,
  AbstractUserProfile,
  createProfilesService,
} from './profiles.service';
import {
  DefaultSocialProviders,
  SocialProfile,
  SocialProvider,
  SocialProvidersToken,
} from './social-provider';

export type CaliobaseAuthProfileEntities<
  TUser extends AbstractUserProfile,
  TOrganization extends AbstractOrganizationProfile
> = {
  UserProfile: Type<TUser> | null;
  OrganizationProfile: Type<TOrganization> | null;

  socialProfileToUserProfile: (
    socialProfile: SocialProfile
  ) => Omit<TUser, keyof AbstractUserProfile>;
};

export type CaliobaseAuthModuleOptions<
  TUser extends AbstractUserProfile,
  TOrganization extends AbstractOrganizationProfile
> = {
  socialProviders?: SocialProvider[];
  profileEntities: CaliobaseAuthProfileEntities<TUser, TOrganization>;
};

@Module({})
export class CaliobaseAuthModule {
  static async forRootAsync<
    TUser extends AbstractUserProfile,
    TOrganization extends AbstractOrganizationProfile
  >({
    socialProviders = DefaultSocialProviders,
    profileEntities,
  }: CaliobaseAuthModuleOptions<TUser, TOrganization>): Promise<DynamicModule> {
    const builtInEntities = [
      Member,
      Organization,
      UserPassword,
      UserSocialLogin,
      User,
      PasswordResetToken,
      MemberInvitationToken,
    ];

    for (const socialProvider of socialProviders) {
      await socialProvider.init?.();
    }

    const authController = createAuthController({ profileEntities });
    const organizationController = createOrganizationController({
      profileEntities,
    });
    const profilesService = createProfilesService(profileEntities);

    return {
      module: CaliobaseAuthModule,
      global: true,
      imports: [
        TypeOrmModule.forFeature(
          [
            ...builtInEntities,
            profileEntities.UserProfile,
            profileEntities.OrganizationProfile,
          ].filter(nonNull)
        ),
        ConfigModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => {
            const privateKeyBase64 = config.get<string>('JWT_PRIVATE_KEY');
            if (privateKeyBase64 == null) {
              throw new Error('could not get private key');
            }
            const privateKey = Buffer.from(privateKeyBase64, 'base64').toString(
              'utf8'
            );

            return {
              privateKey,
              signOptions: {
                algorithm: 'RS256',
              },
            };
          },
        }),
      ],
      providers: [
        JwtStrategy,
        AuthService,
        OrganizationService,
        {
          provide: SocialProvidersToken,
          useValue: socialProviders,
        },
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        { provide: AbstractAuthController, useClass: authController },
        {
          provide: AbstractOrganizationController,
          useClass: organizationController,
        },
        { provide: AbstractProfileService, useClass: profilesService },
      ],
      controllers: [authController, organizationController],
      exports: [AuthService],
    };
  }
}
