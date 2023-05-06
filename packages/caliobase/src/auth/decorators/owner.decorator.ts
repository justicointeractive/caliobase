import { Type } from '@nestjs/common';
import { Column, ManyToOne } from 'typeorm';
import { Organization } from '../entities/organization.entity';

const ownerKey = 'caliobase:owner';

export function EntityOwner({
  eager = false,
}: {
  eager?: boolean;
} = {}): PropertyDecorator {
  return function (target, propertyName) {
    Reflect.defineMetadata(ownerKey, propertyName, target.constructor);
    ManyToOne(() => Organization, { eager })(target, propertyName);
    Reflect.defineMetadata(
      'design:type',
      String,
      target,
      `${String(propertyName)}Id`
    );
    Column({ nullable: true })(target, `${String(propertyName)}Id`);
  };
}

export function getOwnerProperty(entity: Type<unknown>) {
  return Reflect.getMetadata(ownerKey, entity) as string | symbol;
}

export function getOrganizationFilter(
  entity: Type<unknown>,
  owner: { id: string } | null
) {
  const ownerOrgPropertyName = getOwnerProperty(entity);

  return ownerOrgPropertyName
    ? {
        [ownerOrgPropertyName]: owner,
      }
    : {};
}
