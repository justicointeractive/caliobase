import { FindOperator } from 'typeorm';
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
    expect(notStartsWith).toEqual(
      expect.objectContaining({
        _type: 'not',
        _value: expect.objectContaining({
          _type: 'like',
          _value: 'foo%',
        }),
      })
    );
  });
});
