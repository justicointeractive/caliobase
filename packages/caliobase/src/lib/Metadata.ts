/* eslint-disable @typescript-eslint/ban-types */

export class Metadata<T> {
  constructor(private key: string | symbol) {}

  define(value: T, target: Object) {
    Reflect.defineMetadata(this.key, value, target);
  }

  get(target: Object): T | undefined {
    return Reflect.getMetadata(this.key, target) as T | undefined;
  }
}

export function defineDecoratedMethod(
  decorators: MethodDecorator[],
  method: (this: Record<symbol | string, unknown>) => void,
  target: Object,
  propertyName: symbol | string
) {
  Object.defineProperty(target, propertyName, {
    value: method,
  });

  Reflect.decorate(decorators, target, propertyName);
}
