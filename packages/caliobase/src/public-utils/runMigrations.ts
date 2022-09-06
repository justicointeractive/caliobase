import { format } from '@sqltools/formatter';
import { nonNull } from 'circumspect';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { orderBy } from 'lodash';
import { join } from 'path';
import { DataSource, EntityManager, Table } from 'typeorm';
import { SqlInMemory } from 'typeorm/driver/SqlInMemory';
import { parse, stringify } from 'yaml';

const migrationFileNamePattern = /^(?<timestamp>\d+)-(?<label>[^.]*).yml$/;

export type QuerySetKey = 'upQueries' | 'downQueries';
export type QuerySets = Record<QuerySetKey, QuerySet>;
export type QuerySet = Query[];
export type Query = {
  query: string;
  parameters: any[] | null | undefined;
};
export type QueryExecution = {
  name: string;
  querySet: QuerySet;
};

export type MigrationsOptions = {
  migrationsTableName?: string;
  migrationsDir?: string;
  /** @default `true` when `process.env.NODE_ENV === 'development'` otherwise `false` */
  generateMigrations?: boolean;
};

export type RunMigrationsOptions = {
  /**
   * Only run migrations less than or equal to this date; and, if any migrations are generated, generate them with this date.
   * @default now
   */
  timestamp?: Date;
};

export async function runMigrations(
  dataSource: DataSource,
  options: MigrationsOptions & RunMigrationsOptions = {}
) {
  return await new Migrations(dataSource, options).runMigrations(options);
}

/**
 * `0000000000000` is a special migration, useful if you are switching from TypeORM's `synchronize` method to migrations.
 * `0000000000000` will be skipped if any table in the entity schema already exists.
 * If you are switching from `synchronize` to migrations you should use a new database and generate a migration against that, then rename the migration to `0000000000000-generated.yml`.
 */
export class Migrations {
  static defaultOptions: Required<MigrationsOptions> = {
    migrationsTableName: 'migrations',
    generateMigrations: process.env.NODE_ENV === 'development',
    migrationsDir: './migrations',
  };

  options: Required<MigrationsOptions>;

  constructor(private dataSource: DataSource, options: MigrationsOptions) {
    this.options = { ...Migrations.defaultOptions, ...options };
  }

  async runMigrations(options: RunMigrationsOptions) {
    const alreadyRun = await this.getAlreadyRunMigrations();
    const alreadyRunFiles = new Set(alreadyRun?.map(({ name }) => name));

    const shouldSkip0thMigration =
      alreadyRun == null && // has not created migration table
      // but has already created some tables
      (await this.dataSource.createQueryRunner().getTables()).some((table) =>
        this.dataSource.entityMetadatas.some(
          (metadata) => metadata.tableName === table.name
        )
      );

    const existingMigrations = (
      await readdir(this.options.migrationsDir).catch((err) => {
        if (this.options.generateMigrations) {
          return [];
        }
        throw err;
      })
    )
      .map((file) => {
        const match = file.match(migrationFileNamePattern)?.groups;
        return match
          ? {
              timestamp: new Date(Number(match['timestamp'])),
              label: match['label'],
              file,
              filePath: join(this.options.migrationsDir, file),
            }
          : null;
      })
      .filter(nonNull)
      .filter(
        (migration) =>
          options.timestamp == null || migration.timestamp <= options.timestamp
      )
      .filter(
        (migration) =>
          !(shouldSkip0thMigration && migration.timestamp.getTime() === 0)
      );

    const orderedExistingMigrations = orderBy(
      existingMigrations,
      ({ timestamp }) => timestamp,
      'asc'
    );
    const pendingQueryExecuted: QueryExecution[] = [];
    // run pending migrations
    await this.dataSource.transaction(async (transaction) => {
      for (const { file, filePath } of orderedExistingMigrations) {
        if (alreadyRunFiles.has(file)) {
          continue;
        }
        const fileContents = await readFile(filePath, 'utf8');
        const executed = await this.executeMigrationFileContents(
          transaction,
          fileContents,
          file,
          'upQueries'
        );
        pendingQueryExecuted.push(executed);
      }
    });

    const builder = this.dataSource.driver.createSchemaBuilder();
    const queries = this.options.generateMigrations && (await builder.log());

    const newQueryExcuted: QueryExecution[] = [];

    if (queries && [...queries.upQueries, ...queries.downQueries].length > 0) {
      await mkdir(this.options.migrationsDir, { recursive: true });

      const timestamp = (options.timestamp ?? new Date())
        .getTime()
        .toString()
        .padStart(13, '0');
      const label = 'generated';
      const migrationName = `${timestamp}-${label}.yml`;
      const migrationFilePath = join(
        `${this.options.migrationsDir}`,
        migrationName
      );
      const yml = await this.generateMigrationFileContents(queries);
      await this.dataSource.transaction(async (transaction) => {
        const executed = await this.executeMigrationFileContents(
          transaction,
          yml,
          migrationName,
          'upQueries'
        );
        newQueryExcuted.push(executed);
        await writeFile(migrationFilePath, yml);
      });
    }

    return { pendingQueryExecuted, newQueryExcuted };
  }

  async generateMigrationFileContents(queries: SqlInMemory) {
    return stringify({
      upQueries: queries.upQueries.map(({ query, parameters }) => ({
        query: format(query),
        ...(parameters ? { parameters } : {}),
      })),
      downQueries: queries.downQueries.map(({ query, parameters }) => ({
        query: format(query),
        ...(parameters ? { parameters } : {}),
      })),
    });
  }

  async executeMigrationFileContents(
    transaction: EntityManager,
    fileSource: string,
    migrationName: string,
    querySetKey: QuerySetKey
  ) {
    const querySets = parse(fileSource) as QuerySets;
    const querySet = querySets[querySetKey];

    for (const query of querySet) {
      await transaction.query(query.query, query.parameters ?? undefined);
    }
    await this.insertRunMigration(migrationName);

    return { name: migrationName, querySet };
  }

  async getAlreadyRunMigrations() {
    const runner = this.dataSource.createQueryRunner();
    const migrationsTableName = this.options.migrationsTableName;
    const tableExists = await runner.hasTable(migrationsTableName);

    if (!tableExists) {
      return null;
    }

    const rawResults = await this.dataSource
      .createQueryBuilder(runner)
      .select()
      .from(migrationsTableName, 'migrations')
      .getRawMany();

    return rawResults.map((result) => ({
      name: String(result.name),
    }));
  }

  async insertRunMigration(name: string) {
    const runner = this.dataSource.createQueryRunner();
    const migrationsTableName = this.options.migrationsTableName;

    const tableExists = await runner.hasTable(migrationsTableName);

    if (!tableExists) {
      await runner.createTable(
        new Table({
          name: migrationsTableName,
          columns: [
            {
              name: 'name',
              type: runner.connection.driver.normalizeType({
                type: String,
              }),
              isPrimary: true,
              isNullable: false,
            },
          ],
        })
      );
    }

    await runner.manager
      .createQueryBuilder()
      .insert()
      .into(migrationsTableName)
      .values([{ name }])
      .execute();
  }
}
