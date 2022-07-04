import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { CaliobaseEntity } from '..';
import { createEntityModule } from './createEntityModule';

describe('entity module', () => {
  @CaliobaseEntity()
  class TestEntity {
    @PrimaryGeneratedColumn()
    id!: string;

    @Column()
    label!: string;
  }

  it('should create entity module', async () => {
    const module = createEntityModule(TestEntity, {});
    const app = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          retryAttempts: 0,
          entities: [TestEntity],
          synchronize: true,
        }),
        module,
      ],
    }).compile();

    const service = app.get<InstanceType<typeof module.EntityService>>(
      module.EntityService
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
    expect(all).not.toHaveLength(0);
  });
});
