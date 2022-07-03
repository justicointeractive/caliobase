import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as supertest from 'supertest';

export function useSuperTestRequest(module: ModuleMetadata) {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule(module).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  return () => supertest(app.getHttpServer());
}
