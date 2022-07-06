import { Type } from '@nestjs/common';
import { ValidatorOptions } from 'class-validator';
import { getAclProperty } from '../auth/acl/getAclEntityAndProperty';
import { createOneToManyController } from './createOneToManyController';

export function createAclController(
  Entity: Type<any>,
  options: { validatorOptions: ValidatorOptions }
): Type<any> {
  const aclProperty = getAclProperty(Entity);

  return createOneToManyController(Entity, aclProperty, options);
}
