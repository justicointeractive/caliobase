import { Type } from '@nestjs/common';
import { ManyToOne } from 'typeorm';

import { Organization } from '..';

const ownerKey = 'caliobase:owner';

export function EntityOwner({
  eager = false,
}: {
  eager?: boolean;
} = {}): PropertyDecorator {
  return function (target, propertyName) {
    Reflect.defineMetadata(ownerKey, propertyName, target.constructor);
    ManyToOne(() => Organization, { eager })(target, propertyName);
  };
}

export function getOwnerProperty(entity: Type<any>) {
  return Reflect.getMetadata(ownerKey, entity) as string | symbol;
}

export function getOrganizationFilter(
  entity: Type<any>,
  owner: { id: string }
) {
  const ownerOrgPropertyName = getOwnerProperty(entity);

  return ownerOrgPropertyName
    ? {
        [ownerOrgPropertyName]: owner,
      }
    : {};
}
