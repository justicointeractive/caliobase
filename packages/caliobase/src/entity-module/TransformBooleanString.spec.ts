import { plainToClass } from 'class-transformer';
import { TransformBooleanString } from './TransformBooleanString';
describe('TransformBooleanString', () => {
  it('should parse string', async () => {
    class Test {
      @TransformBooleanString()
      value!: boolean;
    }

    expect(plainToClass(Test, { value: null }).value).toEqual(null);
    expect(plainToClass(Test, { value: '1' }).value).toEqual(true);
    expect(plainToClass(Test, { value: '0' }).value).toEqual(false);
    expect(() => plainToClass(Test, { value: 'octopus' }).value).toThrow();
  });
});
