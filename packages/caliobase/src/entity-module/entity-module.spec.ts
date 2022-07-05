import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { CaliobaseEntity, EntityOwner, Organization } from '..';
import { createEntityModule } from './createEntityModule';

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

    const app = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          retryAttempts: 0,
          entities: [Organization, TestEntity],
          synchronize: true,
        }),
        entityModule,
      ],
    }).compile();

    const service = app.get<InstanceType<typeof entityModule.EntityService>>(
      entityModule.EntityService
    );

    const created = await service.create(
      { label: 'test123' },
      { owner: { id: 'test123' } }
    );
    expect(created).not.toBeNull();
    const all = await service.findAll(
      { where: {} },
      { owner: { id: 'test123' } }
    );
    expect(all).toHaveLength(1);
  });
});
