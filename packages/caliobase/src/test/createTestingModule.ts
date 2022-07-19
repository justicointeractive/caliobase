import { faker } from '@faker-js/faker';
import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { IsString } from 'class-validator';
import { createTransport } from 'nodemailer';
import * as supertest from 'supertest';
import { Column, DataSource, Entity, OneToOne, PrimaryColumn } from 'typeorm';
import {
  AuthService,
  CaliobaseRequestUser,
  Member,
  Organization,
  OrganizationService,
} from '../auth';
import { AbstractUserProfile } from '../auth/profiles.service';
import { CaliobaseModule } from '../caliobase.module';
import { Role } from '../entity-module/roles';
import { S3ObjectStorageProvider } from '../object-storage';
import { fakeUser } from './fakeUser';
import { mutex } from './mutex';

@Entity()
class UserFirstLastProfile extends AbstractUserProfile {
  @IsString()
  @Column()
  firstName!: string;

  @IsString()
  @Column()
  lastName!: string;
}

@Entity()
class OrganizationNameProfile {
  @PrimaryColumn()
  organizationId!: string;

  @OneToOne(() => Organization)
  organization!: Organization;

  @IsString()
  name!: string;
}

export async function createTestingModule({
  typeormOptions,
  ...metadata
}: ModuleMetadata & { typeormOptions?: TypeOrmModuleOptions } = {}) {
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
            retryAttempts: 0,
            synchronize: false,
            autoLoadEntities: true,
            logging: process.env.TYPEORM_LOGGING === '1',
            ...(typeormOptions ?? {
              type: 'postgres',
              url: pgConnectionString,
            }),
          };
        },
      }),
      CaliobaseModule.forRootAsync({
        baseUrl: '',
        profileEntities: {
          user: UserFirstLastProfile,
          organization: OrganizationNameProfile,
        },
        controllerEntities: [],
        otherEntities: [],
        emailTransport: createTransport({}),
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

  await mutex('caliobase-testing-module-synchronize', async () => {
    const dataSource = module.get(DataSource);
    if (dataSource.options.type === 'postgres') {
      await dataSource.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    }
    await dataSource.synchronize();
  });

  return module;
}

type WithRequest<
  T extends {
    module: TestingModule;
  }
> = T & { app: INestApplication; request: supertest.SuperTest<supertest.Test> };

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
      app,
      request: supertest(httpServer),
    });
  });

  afterAll(async () => {
    await result?.module.close();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy<WithRequest<T>>({} as any, {
    get(_target, p1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new Proxy({} as any, {
        get(_target, p2) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (result as any)[p1][p2];
        },
      });
    },
  });
}

export async function createTestOrganization(module: TestingModule) {
  const authService = module.get(AuthService);
  const orgService = module.get(OrganizationService);

  const owner = await authService.createUserWithPassword(fakeUser());
  const organization = await orgService.createOrganization(owner.id, {
    name: faker.company.companyName(),
  });
  const member = await orgService.getMember(owner.id, organization.id);

  return {
    owner: { user: member.user, member, organization: member.organization },
    organization,
  };
}

export async function createTestUserWithRole(
  module: TestingModule,
  owner: Member,
  roles: Role[]
) {
  const authService = module.get(AuthService);
  const orgService = module.get(OrganizationService);

  const otherUser = await authService.createUserWithPassword(fakeUser());

  const invitation = await orgService.createInvitation(owner, roles);

  const member = await orgService.claimInvitation(
    otherUser.id,
    invitation.token
  );

  return { user: member.user, member };
}

export async function createGuestUser(
  module: TestingModule,
  org: Organization
): Promise<CaliobaseRequestUser> {
  const userService = module.get<AuthService>(AuthService);
  const orgService = module.get<OrganizationService>(OrganizationService);
  const guest = await userService.createUserWithPassword(fakeUser());
  const member = await orgService.joinAsGuest(org, guest);
  return { user: member.user, member, organization: member.organization };
}

export function testAnonymousUser(
  organization: Organization
): CaliobaseRequestUser {
  return { user: null, member: null, organization };
}
