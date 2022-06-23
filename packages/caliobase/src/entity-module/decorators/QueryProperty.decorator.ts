import { Type } from '@nestjs/common';

const METADATA_KEY = Symbol('QueryProperty');

export type QueryPropertyItem = {
  key: string | symbol;
  type: Type<any>;
};

function QueryPropertyDecorator(): PropertyDecorator {
  return (target, key) => {
    const properties: Array<QueryPropertyItem> =
      Reflect.getMetadata(METADATA_KEY, target) ?? [];

    const type = Reflect.getMetadata('design:type', target, key);

    properties.push({
      key,
      type,
    });

    Reflect.defineMetadata(METADATA_KEY, properties, target);
  };
}

export const QueryProperty = Object.assign(QueryPropertyDecorator, {
  getKeys(target: any): Array<QueryPropertyItem> {
    return Reflect.getMetadata(METADATA_KEY, target) ?? [];
  },
});
