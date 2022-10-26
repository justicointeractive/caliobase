import { faker } from '@faker-js/faker';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import {
  CaliobaseEntity,
  createEntityModule,
  EntityOwner,
  getOwnerProperty,
  Organization,
} from '..';
import { AuthService } from '../auth/auth.service';
import { AbstractOrganizationProfile } from '../auth/entities/abstract-organization-profile.entity';
import { OrganizationService } from '../auth/organization.service';
import {
  createTestingModule,
  useTestingModule,
} from '../test/createTestingModule';
import { fakeUser } from '../test/fakeUser';

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

      const user = await authService.createUserWithPassword(fakeUser());

      const org = await orgService.createOrganization(user.id, {
        profile: {
          name: faker.company.companyName(),
        } as Partial<AbstractOrganizationProfile>,
      });
      expect(org.id).toBeTruthy();

      const entityService = module.get<
        InstanceType<typeof entityModule.EntityService>
      >(entityModule.EntityService);

      const created = await entityService.create(
        { label: 'test123' },
        {
          organization: { id: org.id },
          user: {
            user: null,
            member: null,
            organization: org,
          },
        }
      );
      expect(created).not.toBeNull();

      const created2 = await entityService.create(
        { label: 'test245' },
        {
          organization: { id: org.id },
          user: {
            user: null,
            member: null,
            organization: org,
          },
        }
      );
      expect(created2).not.toBeNull();

      const all = await entityService.findAll(
        { where: {} },
        {
          organization: { id: org.id },
          user: { user: null, member: null, organization: org },
        }
      );
      expect(all.items).toHaveLength(2);
      const allLimitOne = await entityService.findAll(
        { where: {}, limit: 1 },
        {
          organization: { id: org.id },
          user: { user: null, member: null, organization: org },
        }
      );
      expect(allLimitOne.items).toHaveLength(1);
      const one = await entityService.findOne(
        { where: {} },
        {
          organization: { id: org.id },
          user: { user: null, member: null, organization: org },
        }
      );
      expect(one).toBeTruthy();
      const relation = await entityService.findOne(
        { where: {}, relations: ['organization', 'organization.profile'] },
        {
          organization: { id: org.id },
          user: { user: null, member: null, organization: org },
        }
      );
      expect(relation?.organization).toBeTruthy();
      expect(relation?.organization.profile).toBeTruthy();
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
