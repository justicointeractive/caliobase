import { Type } from '@nestjs/common';
import { fromPairs } from 'lodash';
import { getMetadataArgsStorage } from 'typeorm';
import { ColumnMetadataArgs } from 'typeorm/metadata-args/ColumnMetadataArgs';

export function getPrimaryColumns<TEntity>(entity: Type<TEntity>) {
  const primaryColumns = getMetadataArgsStorage().columns.filter(
    (col) =>
      typeof col.target !== 'string' &&
      (entity === col.target || entity.prototype instanceof col.target) &&
      col.options.primary
  );

  return primaryColumns;
}

export function pickColumnProperties<T>(
  primaryColumns: ColumnMetadataArgs[],
  params: T
) {
  return fromPairs(
    primaryColumns.map((col) => [
      col.propertyName,
      params[col.propertyName as keyof T],
    ])
  ) as Record<keyof T, unknown>;
}

export function isGenerated(col: ColumnMetadataArgs): boolean {
  return (
    getMetadataArgsStorage().findGenerated(col.target, col.propertyName) != null
  );
}

export function toColumnRoutePath(columns: (string | ColumnMetadataArgs)[]) {
  return columns
    .map((col) => `:${typeof col === 'string' ? col : col.propertyName}`)
    .join('/');
}
