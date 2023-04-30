import { Type } from '@nestjs/common';
import { Operator } from '../Operator';

const METADATA_KEY = Symbol('QueryProperty');

export type QueryPropertyItem = {
  key: string | symbol;
  type: Type<unknown>;
  operators: Operator<unknown>[];
};

export type QueryPropertyDecoratorOptions = {
  operators?: Operator<unknown>[];
};

function QueryPropertyDecorator(
  options?: QueryPropertyDecoratorOptions
): PropertyDecorator {
  return (target, key) => {
    const properties: Array<QueryPropertyItem> =
      Reflect.getMetadata(METADATA_KEY, target) ?? [];

    const type = Reflect.getMetadata('design:type', target, key);

    properties.push({
      key,
      type,
      operators: options?.operators ?? [],
    });

    Reflect.defineMetadata(METADATA_KEY, properties, target);
  };
}

export const QueryProperty = Object.assign(QueryPropertyDecorator, {
  getKeys(target: object): Array<QueryPropertyItem> {
    return Reflect.getMetadata(METADATA_KEY, target) ?? [];
  },
});
