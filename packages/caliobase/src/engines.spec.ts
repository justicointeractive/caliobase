import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { createTestingModule } from './test/createTestingModule';

const engines: Partial<TypeOrmModuleOptions>[] = [
  {
    type: 'postgres',
    url: process.env.PG_CONNECTION_STRING,
  },
  {
    type: 'mysql',
    url: process.env.MYSQL_CONNECTION_STRING,
  },
  {
    type: 'sqlite',
    database: './tmp/db.db',
  },
];

describe('db engines', () => {
  it('should synchronize schema on all supported db engines', async () => {
    for (const engine of engines) {
      await createTestingModule({ typeormOptions: engine });
    }
  });
});
