import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTestAccount, createTransport } from 'nodemailer';
import * as supertest from 'supertest';
import { CaliobaseModule } from '../caliobase.module';
import { S3ObjectStorageProvider } from '../object-storage';

export async function createTestingModule(metadata: ModuleMetadata) {
  const testAccount = await createTestAccount();

  const module = await Test.createTestingModule({
    ...metadata,
    imports: [
      TypeOrmModule.forRoot({
        type: 'postgres',
        retryAttempts: 0,
        synchronize: true,
        autoLoadEntities: true,
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
};

export function useTestingModule<
  T extends {
    module: TestingModule;
  }
>(module: () => Promise<T>): WithRequest<T> {
  let result: WithRequest<T>;

  beforeAll(async () => {
    const moduleResult = await module();
    const app = moduleResult.module.createNestApplication();
    await app.init();
    const httpServer = app.getHttpServer();
    result = Object.assign(moduleResult, {
      request: supertest(httpServer),
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