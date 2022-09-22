import {
  CaliobaseModule,
  S3ObjectStorageProvider,
  TOKEN_TOKEN,
} from '@caliobase/caliobase';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTransport } from 'nodemailer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Bank, Configuration, ConfigurationBank, Note } from './entities';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: async (config: ConfigService) => {
        let pgConnectionString = config.get('PG_CONNECTION_STRING');
        if (config.get('PG_CONNECTION_JSON')) {
          const { host, port, username, password } = JSON.parse(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            config.get('PG_CONNECTION_JSON')!
          );
          pgConnectionString = `postgresql://${username}:${password}@${host}:${port}/postgres`;
        }

        return {
          type: 'postgres',
          url: pgConnectionString,
          synchronize: false,
          logging: process.env.TYPEORM_LOGGING === '1',
          autoLoadEntities: true,
        };
      },
    }),
    CaliobaseModule.forRootAsync({
      allowCreateOwnOrganizations: true,
      objectStorageProvider: new S3ObjectStorageProvider({
        bucket: 'bucket',
        keyPrefix: '',
        cdnUrlPrefix: '',
      }),
      profileEntities: {
        UserProfile: null,
        OrganizationProfile: null,
        socialProfileToUserProfile: null,
      },
      controllerEntities: [Bank, Configuration],
      otherEntities: [ConfigurationBank, Note],
      urls: {
        forgotPassword: `https://example.org/?token=${TOKEN_TOKEN}`,
      },
      emailTransport: createTransport({
        host: 'smtp.example.com',
        port: 587,
        secure: false, // upgrade later with STARTTLS
        auth: {
          user: 'username',
          pass: 'password',
        },
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
