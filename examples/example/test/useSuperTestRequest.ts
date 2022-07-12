import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as supertest from 'supertest';
import { DataSource } from 'typeorm';

export function useSuperTestRequest(module: ModuleMetadata) {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule(module).compile();
    const dataSource = moduleRef.get(DataSource);
    if (dataSource.options.type === 'postgres') {
      await dataSource.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    }
    await dataSource.synchronize();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  return () => supertest(app.getHttpServer());
}
