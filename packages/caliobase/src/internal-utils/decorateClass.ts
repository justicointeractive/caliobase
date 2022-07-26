import { Type } from '@nestjs/common';

export function decorateClass<T>(
  type: Type<T>,
  classDecorators: ClassDecorator[],
  propertyDecorators?: ReadonlyArray<[keyof T, PropertyDecorator[]]>
) {
  Reflect.decorate(classDecorators, type);

  if (propertyDecorators != null) {
    for (const [
      _,
      [propertyName, decorators],
    ] of propertyDecorators.entries()) {
      Reflect.decorate(
        decorators,
        type.prototype,
        propertyName as string | symbol
      );
    }
  }
}
