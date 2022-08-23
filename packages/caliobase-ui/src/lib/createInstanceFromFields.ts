import { ContentField } from './types';

export function createInstanceFromFields<T extends { id: string }>(
  fields: ContentField<string, any, any>[]
) {
  return Object.fromEntries(
    fields.map(({ property, defaultValue }) => [property, defaultValue()])
  ) as T;
}
