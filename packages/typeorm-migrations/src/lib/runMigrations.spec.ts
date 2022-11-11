import { rm } from 'fs/promises';
import { resolve } from 'path';
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { runMigrations } from './runMigrations';

describe('runMigrations', () => {
  const migrationsDir = resolve(`./tmp/test_migrations`);
  const entityTableName = 'caliobase_test_migrations_entity';
  const migrationsTableName = 'caliobase_test_migrations';
  const migrationOptions = {
    migrationsDir,
    migrationsTableName,
    generateMigrations: true,
  };
  let order = -1;

  beforeAll(async () => {
    const dataSource = await initializeDataSource();
    const runner = dataSource.createQueryRunner();
    await runner.dropTable(migrationsTableName, true);
    await runner.dropTable(entityTableName, true);
    await rm(migrationsDir, { recursive: true, force: true });
  });

  it('should create new migrations', async () => {
    @Entity(entityTableName)
    class TestMigrationsEntity {
      @PrimaryGeneratedColumn()
      id!: string;

      @Column()
      name!: string;
    }

    const dataSource = await initializeDataSource(TestMigrationsEntity);
    expect(
      await runMigrations(dataSource, {
        ...migrationOptions,
        timestamp: new Date(order++),
      })
    ).toMatchSnapshot();
  });

  it('should add a column', async () => {
    @Entity(entityTableName)
    class TestMigrationsEntity {
      @PrimaryGeneratedColumn()
      id!: string;

      @Column()
      name!: string;

      @Column()
      description!: string;
    }

    const dataSource = await initializeDataSource(TestMigrationsEntity);
    expect(
      await runMigrations(dataSource, {
        ...migrationOptions,
        timestamp: new Date(order++),
      })
    ).toMatchSnapshot();
  });

  it('should remove a column', async () => {
    @Entity(entityTableName)
    class TestMigrationsEntity {
      @PrimaryGeneratedColumn()
      id!: string;

      @Column()
      name!: string;
    }

    const dataSource = await initializeDataSource(TestMigrationsEntity);
    expect(
      await runMigrations(dataSource, {
        ...migrationOptions,
        timestamp: new Date(order++),
      })
    ).toMatchSnapshot();
  });

  it('should run other migrations', async () => {
    const dataSource = await initializeDataSource();
    const runner = dataSource.createQueryRunner();
    await runner.dropTable(migrationsTableName, true);
    await runner.dropTable(entityTableName, true);

    expect(
      await runMigrations(dataSource, {
        ...migrationOptions,
        timestamp: new Date(order++),
      })
    ).toMatchSnapshot();
  });

  it('should skip zeroth migration if not empty', async () => {
    @Entity(entityTableName)
    class TestMigrationsEntity {
      @PrimaryGeneratedColumn()
      id!: string;

      @Column()
      name!: string;
    }

    const dataSource = await initializeDataSource(TestMigrationsEntity);
    const runner = dataSource.createQueryRunner();
    await runner.dropTable(migrationsTableName, true);
    await runner.dropTable(entityTableName, true);

    expect(
      await runMigrations(dataSource, {
        ...migrationOptions,
        timestamp: new Date(0),
        generateMigrations: false,
      })
    ).toMatchSnapshot();

    await runner.dropTable(migrationsTableName, true);

    expect(
      await runMigrations(dataSource, {
        ...migrationOptions,
        timestamp: new Date(order++),
        generateMigrations: false,
      })
    ).toMatchSnapshot();

    expect(
      await runMigrations(dataSource, {
        ...migrationOptions,
        timestamp: new Date(order++),
        generateMigrations: false,
      })
    ).toMatchSnapshot();
  }, 5_000);
});

async function initializeDataSource(TestMigrationsEntity?: new () => any) {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.PG_CONNECTION_STRING,
    entities: TestMigrationsEntity && [TestMigrationsEntity],
    synchronize: false,
    migrationsRun: false,
    logging: process.env.TYPEORM_LOGGING === '1',
  });
  await dataSource.initialize();
  return dataSource;
}
