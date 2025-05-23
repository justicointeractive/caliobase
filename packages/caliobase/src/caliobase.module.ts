import {
  MigrationsOptions,
  RunLockOptions,
  runMigrations,
} from '@caliobase/typeorm-migrations';
import { DynamicModule, INestApplication, Module } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Command } from 'commander';
import { mkdir } from 'fs/promises';
import { Server } from 'http';
import { join } from 'path';
import { DataSource } from 'typeorm';
import {
  CaliobaseAuthModule,
  CaliobaseAuthModuleOptions,
} from './auth/auth.module';
import { AbstractOrganizationProfile } from './auth/entities/abstract-organization-profile.entity';
import { AbstractUserProfile } from './auth/entities/abstract-user-profile.entity';
import { CaliobaseConfigOptions } from './config';
import { CaliobaseConfigModule } from './config/config.module';
import {
  CaliobaseEntitiesModule,
  CaliobaseEntitiesModuleOptions,
} from './entity-module/entities-module.module';
import { writeFileIfDifferent } from './lib/writeFileIfDifferent';
import {
  CaliobaseObjectStorageModule,
  CaliobaseObjectStorageModuleOptions,
} from './object-storage/object-storage.module';

export type CaliobaseModuleOptions<
  TUser extends AbstractUserProfile,
  TOrganization extends AbstractOrganizationProfile
> = CaliobaseEntitiesModuleOptions &
  (CaliobaseObjectStorageModuleOptions | { objectStorageProvider: null }) &
  CaliobaseAuthModuleOptions<TUser, TOrganization> &
  CaliobaseConfigOptions;

@Module({})
export class CaliobaseModule {
  static async bootstrap(
    app: INestApplication,
    options: {
      migration?: MigrationsOptions & RunLockOptions;
      keepAlive?: {
        keepAliveTimeout?: number;
        headersTimeout?: number;
      };
    } = {}
  ) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('caliobase')
        .setDescription('The caliobase app API description')
        .setVersion('1.0')
        .addBearerAuth({
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Bearer',
          name: 'JWT',
          description: 'Access Token',
          in: 'header',
        })
        .build()
    );

    SwaggerModule.setup('swagger', app, document);

    const { writeSwagger, writeSwaggerAndExit } = new Command()
      .option(`--write-swagger [path]`)
      .option(`--write-swagger-and-exit [path]`)
      .parse(process.argv)
      .opts();

    if (writeSwagger || writeSwaggerAndExit) {
      const swaggerPath = writeSwagger || writeSwaggerAndExit;
      await mkdir(join(swaggerPath, '..'), {
        recursive: true,
      });
      await writeFileIfDifferent(
        swaggerPath,
        JSON.stringify(document, null, 2)
      );
      if (writeSwaggerAndExit) {
        await app.close();
        process.exit(0);
      }
    }

    if (options.migration != null) {
      await runMigrations(app.get(DataSource), options.migration);
    }

    const server = app.getHttpServer();
    if (server instanceof Server) {
      // AWS ALB default keep-alive timeout is 3600 seconds. We want to match that.
      const DEFAULT_HTTP_KEEP_ALIVE_TIMEOUT_SECONDS = 3600;
      server.keepAliveTimeout =
        options.keepAlive?.keepAliveTimeout ??
        DEFAULT_HTTP_KEEP_ALIVE_TIMEOUT_SECONDS * 1000;
      server.headersTimeout =
        options.keepAlive?.headersTimeout ??
        (DEFAULT_HTTP_KEEP_ALIVE_TIMEOUT_SECONDS + 1) * 1000;
    } else if (options.keepAlive != null) {
      throw new Error(
        `keepAlive option is only supported when using the built-in HTTP server.`
      );
    }
  }

  static async forRootAsync<
    TUser extends AbstractUserProfile,
    TOrganization extends AbstractOrganizationProfile
  >({
    objectStorageProvider,
    socialProviders,
    profileEntities,
    controllerEntities,
    otherEntities,
    validatorOptions,
    ...config
  }: CaliobaseModuleOptions<TUser, TOrganization>): Promise<DynamicModule> {
    return {
      module: CaliobaseModule,
      imports: [
        CaliobaseConfigModule.forRootAsync(config),
        CaliobaseAuthModule.forRootAsync({ socialProviders, profileEntities }),
        ...(objectStorageProvider
          ? [
              CaliobaseObjectStorageModule.forRootAsync({
                objectStorageProvider,
              }),
            ]
          : []),
        CaliobaseEntitiesModule.forRootAsync({
          controllerEntities,
          otherEntities,
          validatorOptions,
          profileEntities,
        }),
      ],
    };
  }
}
