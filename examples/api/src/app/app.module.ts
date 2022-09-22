import { CaliobaseModule, TOKEN_TOKEN } from '@caliobase/caliobase';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Example } from './entities/example.entity';
import { OrganizationProfile } from './entities/organization-profile.entity';
import { UserProfile } from './entities/user-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: './tmp/test-data.db',
      autoLoadEntities: true,
    }),
    CaliobaseModule.forRootAsync({
      allowCreateOwnOrganizations: true,
      controllerEntities: [Example],
      otherEntities: [],
      profileEntities: {
        OrganizationProfile,
        UserProfile,
        socialProfileToUserProfile: null,
      },
      emailTransport: null!,
      objectStorageProvider: null,
      urls: {
        forgotPassword: `https://example.org/forgotPassword?token=${TOKEN_TOKEN}`,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
