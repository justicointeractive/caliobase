import { Type } from '@nestjs/common';
import { ValidatorOptions } from 'class-validator';
import { getAclProperty } from '../auth/acl/getAclEntityAndProperty';
import { createOneToManyController } from './createOneToManyController';

export function createAclController(
  Entity: Type<unknown>,
  options: { validatorOptions: ValidatorOptions }
): { controller: Type<unknown>; manyEntity: Type<unknown> } {
  const aclProperty = getAclProperty(Entity);

  return createOneToManyController(Entity, aclProperty, options);
}
