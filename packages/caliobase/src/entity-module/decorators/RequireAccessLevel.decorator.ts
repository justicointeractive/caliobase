import { Type } from '@nestjs/common';
import { Role } from '../roles';

export function RequireWriteAccessLevel(level: Role): PropertyDecorator {
  return (target, key) => {
    Reflect.defineMetadata(
      'caliobase:write-access-level-required',
      level,
      target,
      key
    );
  };
}

export function getRequiredWriteAccessLevel(
  Entity: Type<any>,
  propertyName: string
): Role | undefined {
  return Reflect.getMetadata(
    'caliobase:write-access-level-required',
    Entity.prototype,
    propertyName
  );
}
