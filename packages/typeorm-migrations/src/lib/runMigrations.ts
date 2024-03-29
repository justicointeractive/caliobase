import { format } from '@sqltools/formatter';
import { nonNull } from 'circumspect';
import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { orderBy } from 'lodash';
import { join } from 'path';
import {
  DataSource,
  EntityManager,
  QueryRunner,
  Table,
  TableColumn,
} from 'typeorm';
import { SqlInMemory } from 'typeorm/driver/SqlInMemory';
import { RdbmsSchemaBuilder } from 'typeorm/schema-builder/RdbmsSchemaBuilder';
import { parse, stringify } from 'yaml';

const migrationFileNamePattern = /^(?<timestamp>-?\d+)-(?<label>[^.]*).yml$/;

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

export type RunLockOptions = {
  lock: {
    acquire: () => Promise<{
      // extend: () => Promise<void>;
      release: () => Promise<void>;
    }>;
  };
};

export async function runMigrations(
  dataSource: DataSource,
  options: MigrationsOptions & RunMigrationsOptions & RunLockOptions
) {
  const runner = new Migrations(dataSource, options);
  const lock = await options.lock.acquire();
  try {
    return await runner.runMigrations(options);
  } finally {
    await lock.release();
  }
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

    const hasNotRunMigrationsButHasSomeEntityTables =
      alreadyRun.length === 0 && // has not yet run any migrations
      // but has already created some tables
      (await this.hasSomeEntityTables());

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
      );

    const orderedExistingMigrations = orderBy(
      existingMigrations,
      ({ timestamp }) => timestamp,
      'asc'
    );
    const pendingQueryExecuted: QueryExecution[] = [];

    const runner = this.dataSource.createQueryRunner();
    const schemaBuilder = this.dataSource.driver.createSchemaBuilder();
    await this.createMigrationsTableIfNotExists(runner);
    if (schemaBuilder instanceof RdbmsSchemaBuilder) {
      await schemaBuilder.createMetadataTableIfNecessary(runner);
    }

    // run pending migrations
    await this.dataSource.transaction(async (transaction) => {
      for (const { file, filePath, timestamp } of orderedExistingMigrations) {
        if (alreadyRunFiles.has(file)) {
          continue;
        }
        const fileContents = await readFile(filePath, 'utf8');
        if (
          hasNotRunMigrationsButHasSomeEntityTables &&
          timestamp.getTime() <= 0
        ) {
          await this.insertRunMigration(transaction, file);
        } else {
          const executed = await this.executeMigrationFileContents(
            transaction,
            fileContents,
            file,
            'upQueries'
          );
          pendingQueryExecuted.push(executed);
        }
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
        .replace(/\d+/, (v) => v.padStart(13, '0'));

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

  private async generateMigrationFileContents(queries: SqlInMemory) {
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

  private async executeMigrationFileContents(
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

    await this.insertRunMigration(transaction, migrationName);

    return { name: migrationName, querySet };
  }

  private async getAlreadyRunMigrations() {
    const runner = this.dataSource.createQueryRunner();
    const migrationsTableName = this.options.migrationsTableName;
    const tableExists = await runner.hasTable(migrationsTableName);

    if (!tableExists) {
      return [];
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

  private async insertRunMigration(transaction: EntityManager, name: string) {
    const migrationsTableName = this.options.migrationsTableName;

    await transaction
      .createQueryBuilder()
      .insert()
      .into(migrationsTableName)
      .values([{ name }])
      .execute();
  }

  private async createMigrationsTableIfNotExists(runner: QueryRunner) {
    const migrationsTableName = this.options.migrationsTableName;

    const migrationTable = await createTableIfNotExists(
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

    await addColumnIfNotExists(
      new TableColumn({
        name: 'timestamp',
        type: runner.connection.driver.normalizeType({ type: Date }),
        default: 'CURRENT_TIMESTAMP',
      })
    );

    async function createTableIfNotExists(table: Table) {
      if (!(await runner.hasTable(table))) {
        await runner.createTable(table);
      }
      return table;
    }

    async function addColumnIfNotExists(column: TableColumn) {
      if (!(await runner.hasColumn(migrationTable, column.name))) {
        await runner.addColumn(migrationTable, column);
      }
      return column;
    }
  }
  private async hasSomeEntityTables() {
    const existingTables = await this.dataSource
      .createQueryRunner()
      .getTables();

    const existingTableNames = new Set(
      existingTables.map((table) => table.name)
    );

    const entityTableNames = this.dataSource.entityMetadatas.map(
      (m) => m.tableName
    );

    return entityTableNames.some((tableName) =>
      existingTableNames.has(tableName)
    );
  }
}
