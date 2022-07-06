import { faker } from '@faker-js/faker';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import {
  Acl,
  AuthService,
  CaliobaseEntity,
  createEntityModule,
  EntityAcl,
  EntityOwner,
  getOwnerProperty,
  Organization,
  OrganizationService,
} from '..';
import {
  createTestingModule,
  useTestingModule,
} from '../test/createTestingModule';

describe('entity module', () => {
  describe('standard', function () {
    const { module, entityModule } = useTestingModule(async () => {
      @CaliobaseEntity()
      class TestEntity {
        @PrimaryGeneratedColumn()
        id!: string;

        @Column()
        label!: string;

        @EntityOwner()
        organization!: Organization;
      }

      const entityModule = createEntityModule(TestEntity);

      const module = await createTestingModule({
        imports: [entityModule],
      });

      return { module, entityModule };
    });

    it('should create entity module', async () => {
      const orgService = module.get(OrganizationService);
      const authService = module.get(AuthService);

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

      const entityService = module.get<
        InstanceType<typeof entityModule.EntityService>
      >(entityModule.EntityService);

      const created = await entityService.create(
        { label: 'test123' },
        { organization: { id: org.id } }
      );
      expect(created).not.toBeNull();

      const all = await entityService.findAll(
        { where: {} },
        { organization: { id: org.id } }
      );
      expect(all).toHaveLength(1);
      const one = await entityService.findOne(
        { where: {} },
        { organization: { id: org.id } }
      );
      expect(one).toBeTruthy();
    });
  });

  describe('acl', function () {
    const { module, entityModule, request } = useTestingModule(async () => {
      @CaliobaseEntity({
        controller: { name: 'test' },
      })
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

      const entityModule = createEntityModule(TestEntity);

      const module = await createTestingModule({
        imports: [entityModule],
      });

      return { module, entityModule };
    });

    it('should create entity module', async () => {
      const authService = module.get(AuthService);
      const orgService = module.get(OrganizationService);

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

      const entityService = module.get<
        InstanceType<typeof entityModule['EntityService']>
      >(entityModule.EntityService);

      const created = await entityService.create(
        { label: 'test123' },
        { organization: { id: org.id } }
      );
      expect(created).not.toBeNull();
      const all = await entityService.findAll(
        { where: {} },
        { organization: { id: org.id } }
      );
      expect(all).toHaveLength(1);

      const publicAccessToken = await orgService.createPublicAccessToken();

      {
        const {
          body: { items },
        } = await request
          .get('/test')
          .set('Authorization', `Bearer ${publicAccessToken}`)
          .expect(200);
        expect(items).toHaveLength(0);
      }
    });
  });

  describe('without owner or acl', function () {
    it('should create an implicit owner', async () => {
      @CaliobaseEntity()
      class TestEntity {
        @PrimaryGeneratedColumn()
        id!: string;

        @Column()
        label!: string;
      }

      createEntityModule(TestEntity);

      expect(getOwnerProperty(TestEntity)).toEqual('organization');
    });
  });
});
