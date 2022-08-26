import { DynamicModule, INestApplication, Module } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Command } from 'commander';
import { writeFile } from 'fs/promises';
import {
  CaliobaseAuthModule,
  CaliobaseAuthModuleOptions,
} from './auth/auth.module';
import { AbstractOrganizationProfile } from './auth/entities/abstract-organization-profile.entity';
import { AbstractUserProfile } from './auth/entities/abstract-user-profile.entity';
import {
  CaliobaseConfigModule,
  CaliobaseConfigModuleOptions,
} from './config/config.module';
import {
  CaliobaseEntitiesModule,
  CaliobaseEntitiesModuleOptions,
} from './entity-module/entities-module.module';
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
  CaliobaseConfigModuleOptions;

@Module({})
export class CaliobaseModule {
  async bootstrap(app: INestApplication) {
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

    const { writeSwaggerAndExit } = new Command()
      .option(`--write-swagger-and-exit [path]`)
      .parse(process.argv)
      .opts();

    if (writeSwaggerAndExit) {
      await writeFile(writeSwaggerAndExit, JSON.stringify(document, null, 2));
      await app.close();
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
    urls,
    emailTransport,
    guestRole,
  }: CaliobaseModuleOptions<TUser, TOrganization>): Promise<DynamicModule> {
    return {
      module: CaliobaseModule,
      imports: [
        CaliobaseConfigModule.forRootAsync({
          urls,
          emailTransport,
          guestRole,
        }),
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
        }),
      ],
    };
  }
}
