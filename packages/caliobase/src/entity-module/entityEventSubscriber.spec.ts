import * as assert from 'assert';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { CaliobaseEntity, ICaliobaseService } from '..';
import { EntityOwner, Organization } from '../auth';
import {
  createTestingModule,
  createTestOrganization,
  useTestingModule,
} from '../test/createTestingModule';
import { createEntityModule } from './createEntityModule';

describe('entityEventSubscriber', () => {
  const beforeInsert = jest.fn();
  const beforeInsert2 = jest.fn();
  const beforeUpdate = jest.fn();
  const beforeRemove = jest.fn();

  const { entityService, owner } = useTestingModule(async () => {
    @CaliobaseEntity({
      subscribers: [
        {
          beforeInsert,
          beforeUpdate,
          beforeRemove,
        },
        { beforeInsert: beforeInsert2 },
      ],
    })
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

    const entityService = module.get(
      entityModule.EntityService
    ) as ICaliobaseService<
      { id: string; label: string },
      { label: string },
      { label?: string }
    >;

    assert(entityService);

    const createOrganization = await createTestOrganization(module);

    return {
      module,
      entityModule,
      entityService,
      ...createOrganization,
    };
  });

  it('should subscribe to events', async () => {
    const { id } = await entityService.create(
      { label: 'Test 123' },
      {
        user: owner,
        organization: owner.organization,
      }
    );
    expect(beforeInsert).toHaveBeenCalled();
    expect(beforeInsert2).toHaveBeenCalled();
    await entityService.update(
      { id },
      { label: 'Test 234' },
      { user: owner, organization: owner.organization }
    );
    expect(beforeUpdate).toHaveBeenCalled();
    await entityService.remove(
      { id },
      { user: owner, organization: owner.organization }
    );
    expect(beforeRemove).toHaveBeenCalled();
  });
});
