import { FindOperator, ManyToMany, PrimaryColumn } from 'typeorm';
import { assert } from '../lib/assert';
import { createFindManyQueryParamClass } from './createFindManyQueryParamClass';
import { QueryProperty } from './decorators';

describe('createFindManyQueryParamClass', () => {
  it('should create class', async () => {
    class TestEntity {
      @QueryProperty()
      stringProperty!: string;
      @QueryProperty()
      numberProperty!: number;
    }

    const QueryParamClass = createFindManyQueryParamClass(TestEntity);

    const instance = new QueryParamClass();

    instance['-stringProperty.startsWith'] = 'foo';

    const findOptions = instance.toFindOptions();
    const notStartsWith = findOptions.where.stringProperty;
    assert(notStartsWith instanceof FindOperator);
    expect(notStartsWith).toMatchObject({
      _type: 'not',
      _value: {
        _type: 'like',
        _value: 'foo%',
      },
    });
  });
  it('should create class against relation', async () => {
    class ReferenceEntity {
      id!: string;
    }

    const QueryParamClass = createFindManyQueryParamClass(ReferenceEntity);

    const instance = new QueryParamClass();

    instance['relations'] = ['foo.bar'];

    const findOptions = instance.toFindOptions();
    expect(findOptions.relations).toMatchObject(['foo.bar']);
    expect(findOptions.loadEagerRelations).toBeFalsy();
  });
  it('should create class against many-to-many relation', async () => {
    class ReferenceEntity {
      @PrimaryColumn()
      id!: string;

      @QueryProperty()
      @ManyToMany(() => CategoryEntity)
      categories!: CategoryEntity[];
    }

    class CategoryEntity {
      @PrimaryColumn()
      id!: string;
    }

    const QueryParamClass = createFindManyQueryParamClass(ReferenceEntity);

    const instance = new QueryParamClass();

    instance['categories.id'] = 'abc123';

    const findOptions = instance.toFindOptions();
    expect(findOptions.where).toMatchObject({
      categories: {
        id: 'abc123',
      },
    });
  });
});
