import { Type } from '@nestjs/common';
import { ManyToOne } from 'typeorm';

import { Organization } from '..';

export function EntityOwner(): PropertyDecorator {
  return function (target, propertyName) {
    Reflect.defineMetadata('caliobase:owner', propertyName, target.constructor);
    ManyToOne(() => Organization, { eager: true })(target, propertyName);
  };
}

function getCaliobaseOwnerOrganizationProperty(entity: Type<any>) {
  return Reflect.getMetadata('caliobase:owner', entity) as string | symbol;
}

export function getCaliobaseOwnerOrganizationMixin(
  entity: Type<any>,
  owner: { id: string },
) {
  const ownerOrgPropertyName = getCaliobaseOwnerOrganizationProperty(entity);

  return ownerOrgPropertyName
    ? {
        [ownerOrgPropertyName]: owner,
      }
    : {};
}
