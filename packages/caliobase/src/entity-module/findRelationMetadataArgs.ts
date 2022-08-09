import { Type } from '@nestjs/common';
import { getMetadataArgsStorage } from 'typeorm';

export function findRelationMetadataArgs<T>(
  Entity: Type<T>,
  propertyName: string | symbol
) {
  const oneToManyRelation = getMetadataArgsStorage()
    .filterRelations(Entity)
    .find((relation) => relation.propertyName === propertyName);

  if (oneToManyRelation == null) {
    throw new TypeError(
      `could not find relation for property ${String(propertyName)}`
    );
  }

  return oneToManyRelation;
}
