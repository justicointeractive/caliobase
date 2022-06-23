import { Transform } from 'class-transformer';

export function TransformBooleanString() {
  return Transform(({ value }) => {
    return ['1', 'true'].includes(value);
  });
}
