import {
  DynamicModule,
  Module,
  Type,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValidatorOptions } from 'class-validator';
import { Transporter } from 'nodemailer';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AclItem, getAclEntity } from './auth/entities/acl.entity';
import { Member } from './auth/entities/member.entity';
import { Organization } from './auth/entities/organization.entity';
import { PasswordResetToken } from './auth/entities/password-reset-token.entity';
import { UserPassword } from './auth/entities/user-password.entity';
import { UserSocialLogin } from './auth/entities/user-social-login.entity';
import { User } from './auth/entities/user.entity';
import { JwtAuthGuard } from './auth/guards/jwt.guard';
import { CaliobaseJwtPayload } from './auth/jwt-payload';
import { JwtStrategy } from './auth/jwt.strategy';
import { OrganizationController } from './auth/organization.controller';
import { DefaultSocialProviders } from './auth/social-provider/default-social-providers';
import {
  SocialProvider,
  SocialProvidersToken,
} from './auth/social-provider/social-provider';
import { CaliobaseConfig } from './config/config';
import { createEntityModule } from './entity-module/createEntityModule';
import { MetaController } from './meta/meta.controller';
import { MetaService } from './meta/meta.service';
import { AbstractObjectStorageProvider } from './object-storage/AbstractFileProvider';
import { ObjectStorageObject } from './object-storage/object-storage-object.entity';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends CaliobaseJwtPayload {}
  }
}

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
    AuthService,
    JwtStrategy,
    MetaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [MetaController, AuthController, OrganizationController],
})
export class CaliobaseModule {
  static defaultValidatorOptions: ValidationPipeOptions = {
    transform: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    whitelist: true,
  };

  static forRoot({
    objectStorageProvider,
    socialProviders = DefaultSocialProviders,
    controllerEntities,
    otherEntities: bridgeEntities,
    validatorOptions,
    baseUrl,
    emailTransport,
  }: {
    objectStorageProvider: AbstractObjectStorageProvider;
    socialProviders?: SocialProvider[];
    controllerEntities: Type<unknown>[];
    otherEntities: Type<unknown>[];
    validatorOptions?: ValidatorOptions;
    baseUrl: string;
    emailTransport: Transporter;
  }): DynamicModule {
    return {
      module: CaliobaseModule,
      imports: [
        ...controllerEntities.map((entity) =>
          createEntityModule(entity, {
            ...CaliobaseModule.defaultValidatorOptions,
            ...validatorOptions,
          })
        ),
        TypeOrmModule.forFeature([
          Member,
          Organization,
          UserPassword,
          UserSocialLogin,
          User,
          PasswordResetToken,
          ObjectStorageObject,
          ...bridgeEntities,
          ...controllerEntities
            .map(
              (e) =>
                // eslint-disable-next-line @typescript-eslint/ban-types
                getAclEntity(e) as Function & {
                  prototype: AclItem<{ id: string }>;
                }
            )
            .filter((e): e is typeof AclItem => e != null),
        ]),
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
          }),
        },
      ],
    };
  }
}
