import { Type } from '@nestjs/common';
import { createAclForEntity } from '../acl/createAclForEntity';

export function EntityAcl<T>(entityClass: Type<T>) {
  return function (
    targetEntityPrototype: any,
    targetEntityAclProperty: string | symbol
  ) {
    if (entityClass.prototype !== targetEntityPrototype) {
      throw new Error(
        `you should decorate a property of 'entityClass' with this decorator`
      );
    }
    createAclForEntity<T>(entityClass, targetEntityAclProperty as keyof T);
  };
}
