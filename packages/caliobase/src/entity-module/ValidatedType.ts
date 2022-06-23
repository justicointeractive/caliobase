import { Type } from '@nestjs/common';
import { PickType } from '@nestjs/swagger';
import { getMetadataStorage } from 'class-validator';

function getValidatedProperties<T>(
  type: new (...args: any[]) => T,
): (keyof T)[] {
  return [
    ...new Set(
      getMetadataStorage()
        .getTargetValidationMetadatas(type, type.name, true, false)
        .map((metadata) => metadata.propertyName as keyof T),
    ),
  ];
}

export function ValidatedType<TEntity>(
  type: Type<TEntity>,
  {
    exclude,
    include,
  }: { exclude?: (keyof TEntity)[]; include?: (keyof TEntity)[] } = {},
) {
  return PickType(
    type,
    getValidatedProperties(type).filter((prop) => {
      if (exclude != null && exclude.includes(prop)) {
        return false;
      }
      if (include != null && !include.includes(prop)) {
        return false;
      }
      return true;
    }),
  );
}
