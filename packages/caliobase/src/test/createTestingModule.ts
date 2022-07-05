import { ModuleMetadata } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTestAccount, createTransport } from 'nodemailer';
import { CaliobaseModule } from '../caliobase.module';
import { S3ObjectStorageProvider } from '../object-storage';

export async function createTestingModule(metadata: ModuleMetadata) {
  const testAccount = await createTestAccount();

  const app = await Test.createTestingModule({
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

  await app.init();

  return app;
}

export function useTestingModule<T extends { app: TestingModule }>(
  module: () => Promise<T>
): T {
  let result: T;

  beforeAll(async () => {
    result = await module();
  });

  afterAll(async () => {
    await result.app.close();
  });

  return new Proxy<T>({} as any, {
    get(target, p1, receiver) {
      return new Proxy({} as any, {
        get(target, p2, receiver) {
          return (result as any)[p1][p2];
        },
      });
    },
  });
}
