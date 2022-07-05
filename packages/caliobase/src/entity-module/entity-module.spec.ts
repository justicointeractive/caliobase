import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTestAccount, createTransport } from 'nodemailer';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import {
  AuthService,
  CaliobaseEntity,
  CaliobaseModule,
  createEntityModule,
  EntityOwner,
  Organization,
  OrganizationService,
  S3ObjectStorageProvider,
} from '..';

describe('entity module', () => {
  @CaliobaseEntity()
  class TestEntity {
    @PrimaryGeneratedColumn()
    id!: string;

    @Column()
    label!: string;

    @EntityOwner()
    organization!: Organization;
  }

  it('should create entity module', async () => {
    const entityModule = createEntityModule(TestEntity, {});

    const testAccount = await createTestAccount();

    const app = await Test.createTestingModule({
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
        entityModule,
      ],
    }).compile();

    await app.init();

    const authService = app.get(AuthService);
    const orgService = app.get(OrganizationService);

    const user = await authService.createUserWithPassword({
      email: faker.internet.email(),
      familyName: faker.name.lastName(),
      givenName: faker.name.firstName(),
      password: faker.internet.password(),
    });

    const org = await orgService.createOrganization(user.id, {
      name: faker.company.companyName(),
    });
    expect(org.id).toBeTruthy();

    const entityService = app.get<
      InstanceType<typeof entityModule.EntityService>
    >(entityModule.EntityService);

    const created = await entityService.create(
      { label: 'test123' },
      { owner: { id: org.id } }
    );
    expect(created).not.toBeNull();
    const all = await entityService.findAll(
      { where: {} },
      { owner: { id: org.id } }
    );
    expect(all).toHaveLength(1);
  });
});
