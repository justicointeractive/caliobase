import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
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
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import {
  DefaultSocialProviders,
  SocialProvider,
  SocialProvidersToken,
} from './social-provider';

export type CaliobaseAuthModuleOptions = {
  socialProviders?: SocialProvider[];
};

const builtInEntities = [
  Member,
  Organization,
  UserPassword,
  UserSocialLogin,
  User,
  PasswordResetToken,
  MemberInvitationToken,
];

@Module({})
export class CaliobaseAuthModule {
  static async forRootAsync({
    socialProviders = DefaultSocialProviders,
  }: CaliobaseAuthModuleOptions): Promise<DynamicModule> {
    for (const socialProvider of socialProviders) {
      await socialProvider.init?.();
    }

    return {
      module: CaliobaseAuthModule,
      global: true,
      imports: [
        TypeOrmModule.forFeature(builtInEntities),
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
      controllers: [AuthController, OrganizationController],
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
      ],
      exports: [AuthService],
    };
  }
}
