import { ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTestAccount, createTransport } from 'nodemailer';
import * as supertest from 'supertest';
import { Organization } from '../auth';
import { CaliobaseModule } from '../caliobase.module';
import { MetaService } from '../meta/meta.service';
import { S3ObjectStorageProvider } from '../object-storage';
import { fakeUser } from './fakeUser';

export async function createTestingModule(metadata: ModuleMetadata = {}) {
  const testAccount = await createTestAccount();

  const module = await Test.createTestingModule({
    ...metadata,
    imports: [
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
            retryAttempts: 0,
            synchronize: true,
            autoLoadEntities: true,
            url: pgConnectionString,
            logging: process.env.TYPEORM_LOGGING === '1',
          };
        },
      }),
      CaliobaseModule.forRoot({
        baseUrl: '',
        controllerEntities: [],
        otherEntities: [],
        emailTransport: createTransport({
          ...testAccount.smtp,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        }),
        objectStorageProvider: new S3ObjectStorageProvider({
          bucket: 'test',
          cdnUrlPrefix: '',
          keyPrefix: '',
          endpoint: 'http://localhost.localstack.cloud:4588',
        }),
      }),
      ...(metadata.imports ?? []),
    ],
  }).compile();

  await module.init();

  return module;
}

type WithRequest<
  T extends {
    module: TestingModule;
  }
> = T & {
  request: supertest.SuperTest<supertest.Test>;
  organization?: Organization;
};

export function useTestingModule<
  T extends {
    module: TestingModule;
  }
>(
  module: () => Promise<T>,
  options: { createRoot?: boolean } = {}
): WithRequest<T> {
  let result: WithRequest<T>;

  beforeAll(async () => {
    const moduleResult = await module();
    const app = moduleResult.module.createNestApplication();
    await app.init();
    const httpServer = app.getHttpServer();

    let organization: Organization | undefined = undefined;
    if (options.createRoot) {
      const metaService = moduleResult.module.get<MetaService>(MetaService);
      if (await metaService.getHasRootMember()) {
        organization = (await metaService.getRoot()).organization;
      } else {
        organization = (
          await metaService.createRoot({
            organization: { name: 'Test' },
            user: fakeUser(),
          })
        ).organization;
      }
    }

    result = Object.assign(moduleResult, {
      request: supertest(httpServer),
      ...(organization && { organization }),
    });
  });

  afterAll(async () => {
    await result.module.close();
  });

  return new Proxy<WithRequest<T>>({} as any, {
    get(target, p1, receiver) {
      return new Proxy({} as any, {
        get(target, p2, receiver) {
          return (result as any)[p1][p2];
        },
      });
    },
  });
}
