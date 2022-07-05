import { faker } from '@faker-js/faker';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import {
  Acl,
  AuthService,
  CaliobaseEntity,
  createEntityModule,
  EntityAcl,
  EntityOwner,
  Organization,
  OrganizationService,
} from '..';
import {
  createTestingModule,
  useTestingModule,
} from '../test/createTestingModule';

describe('entity module', () => {
  describe('standard', function () {
    const { app, entityModule } = useTestingModule(async () => {
      @CaliobaseEntity()
      class TestEntity {
        @PrimaryGeneratedColumn()
        id!: string;

        @Column()
        label!: string;

        @EntityOwner()
        organization!: Organization;
      }

      const entityModule = createEntityModule(TestEntity, {});

      const app = await createTestingModule({
        imports: [entityModule],
      });

      return { app, entityModule };
    });

    it('should create entity module', async () => {
      const orgService = app.get(OrganizationService);
      const authService = app.get(AuthService);

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

      await app.close();
    });
  });

  describe('acl', function () {
    const { app, entityModule } = useTestingModule(async () => {
      @CaliobaseEntity()
      class TestEntity {
        @PrimaryGeneratedColumn()
        id!: string;

        @Column()
        label!: string;

        @EntityOwner()
        organization!: Organization;

        @EntityAcl(TestEntity)
        acl!: Acl<TestEntity>;
      }

      const entityModule = createEntityModule(TestEntity, {});

      const app = await createTestingModule({
        imports: [entityModule],
      });

      return { app, entityModule };
    });

    it('should create entity module', async () => {
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

      await app.close();
    });
  });

  describe('without owner or acl', function () {
    it('should not allow unownable thing to be created', async () => {
      @CaliobaseEntity()
      class TestEntity {
        @PrimaryGeneratedColumn()
        id!: string;

        @Column()
        label!: string;
      }

      expect(() => createEntityModule(TestEntity, {})).toThrow();
    });
  });
});
