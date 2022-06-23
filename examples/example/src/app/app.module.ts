import { CaliobaseModule } from '@caliobase/caliobase';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

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
    CaliobaseModule.forRoot({
      controllerEntities: [Bank, Configuration],
      otherEntities: [ConfigurationBank, Note],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
