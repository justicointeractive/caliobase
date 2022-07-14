import { DynamicModule, Module, Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValidatorOptions } from 'class-validator';
import { Transporter } from 'nodemailer';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { MemberInvitationToken } from './auth/entities/member-invitation-token.entity';
import { Member } from './auth/entities/member.entity';
import { Organization } from './auth/entities/organization.entity';
import { PasswordResetToken } from './auth/entities/password-reset-token.entity';
import { UserPassword } from './auth/entities/user-password.entity';
import { UserSocialLogin } from './auth/entities/user-social-login.entity';
import { User } from './auth/entities/user.entity';
import { JwtAuthGuard } from './auth/guards/jwt.guard';
import { JwtStrategy } from './auth/jwt.strategy';
import { OrganizationController } from './auth/organization.controller';
import { OrganizationService } from './auth/organization.service';
import { DefaultSocialProviders } from './auth/social-provider/default-social-providers';
import {
  SocialProvider,
  SocialProvidersToken
} from './auth/social-provider/social-provider';
import { CaliobaseConfig } from './config/config';
import { defaultValidatorOptions } from './defaultValidatorOptions';
import { createEntityModule } from './entity-module/createEntityModule';
import { Role } from './entity-module/roles';
import { MetaController } from './meta/meta.controller';
import { MetaService } from './meta/meta.service';
import { AbstractObjectStorageProvider } from './object-storage/AbstractObjectStorageProvider';
import { ObjectStorageObject } from './object-storage/object-storage-object.entity';
import { ObjectStorageController } from './object-storage/object-storage.controller';
import { ObjectStorageService } from './object-storage/object-storage.service';

const builtInEntities = [
  Member,
  Organization,
  UserPassword,
  UserSocialLogin,
  User,
  PasswordResetToken,
  ObjectStorageObject,
  MemberInvitationToken,
];

export type CaliobaseModuleOptions = {
  objectStorageProvider: AbstractObjectStorageProvider;
  socialProviders?: SocialProvider[];
  controllerEntities: Type<unknown>[];
  otherEntities: Type<unknown>[];
  validatorOptions?: ValidatorOptions;
  baseUrl: string;
  emailTransport: Transporter;
  guestRole?: Role | false;
};

@Module({
  imports: [
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
    MetaService,
    ObjectStorageService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, OrganizationService],
  controllers: [
    MetaController,
    AuthController,
    OrganizationController,
    ObjectStorageController,
  ],
})
export class CaliobaseModule {
  static forRoot({
    objectStorageProvider,
    socialProviders = DefaultSocialProviders,
    controllerEntities,
    otherEntities,
    validatorOptions,
    baseUrl,
    emailTransport,
    guestRole = 'guest',
  }: CaliobaseModuleOptions): DynamicModule {
    return {
      module: CaliobaseModule,
      imports: [
        TypeOrmModule.forFeature([...builtInEntities, ...otherEntities]),
        ...controllerEntities.map((entity) =>
          createEntityModule(entity, {
            ...defaultValidatorOptions,
            ...validatorOptions,
          })
        ),
      ],
      providers: [
        {
          provide: SocialProvidersToken,
          useValue: socialProviders,
        },
        {
          provide: AbstractObjectStorageProvider,
          useValue: objectStorageProvider,
        },
        {
          provide: CaliobaseConfig,
          useValue: new CaliobaseConfig({
            baseUrl,
            emailTransport,
            guestRole,
          }),
        },
      ],
    };
  }
}
