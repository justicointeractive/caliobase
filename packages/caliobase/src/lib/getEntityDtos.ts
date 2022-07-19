import { Type } from '@nestjs/common';
import { PartialType } from '@nestjs/swagger';
import { RenameClass, ValidatedType } from '../entity-module';

const dtosSymbol = Symbol('caliobase:dtos');

export function getEntityDtos<TEntity>(
  entity: Type<TEntity> & { [dtosSymbol]?: ReturnType<typeof createEntityDtos> }
) {
  if (entity[dtosSymbol]) {
    return entity[dtosSymbol];
  }

  const dtos = createEntityDtos(entity);

  entity[dtosSymbol] = dtos;

  return dtos;
}

export function createEntityDtos<TEntity>(entityType: Type<TEntity>): {
  CreateEntityDto: Type<Partial<TEntity>>;
  UpdateEntityDto: Type<Partial<TEntity>>;
} {
  @RenameClass(entityType)
  class CreateEntityDto extends (ValidatedType(entityType) as Type<object>) {}

  @RenameClass(entityType)
  class UpdateEntityDto extends PartialType(CreateEntityDto) {}

  return { CreateEntityDto, UpdateEntityDto };
}
