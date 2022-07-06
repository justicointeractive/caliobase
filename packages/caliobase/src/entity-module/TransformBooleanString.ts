import { Transform } from 'class-transformer';

export function TransformBooleanString() {
  return Transform(({ value }) => {
    if (value == null) {
      return value;
    }

    if (['1', 'true'].includes(value)) {
      return true;
    }

    if (['0', 'false'].includes(value)) {
      return false;
    }

    throw new Error(`invalid value ${value}`);
  });
}
