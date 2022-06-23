import { Type } from '@nestjs/common';

import { AclAccessLevel } from '../..';

export function RequireWriteAccessLevel(
  level: AclAccessLevel,
): PropertyDecorator {
  return (target, key) => {
    Reflect.defineMetadata(
      'caliobase:write-access-level-required',
      level,
      target,
      key,
    );
  };
}

export function getRequiredWriteAccessLevel(
  Entity: Type<any>,
  propertyName: string,
): AclAccessLevel | undefined {
  return Reflect.getMetadata(
    'caliobase:write-access-level-required',
    Entity.prototype,
    propertyName,
  );
}
