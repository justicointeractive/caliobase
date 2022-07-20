import { Type } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type as TypeDecorator } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  Equal,
  FindOperator,
  FindOptionsOrder,
  FindOptionsOrderProperty,
  FindOptionsWhere,
  FindOptionsWhereProperty,
  getMetadataArgsStorage,
  ILike,
  In,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
} from 'typeorm';
import { CaliobaseEntity, QueryProperty } from '.';
import { RenameClass } from './decorators/RenameClass.decorator';

type OperatorType<T> = T extends [Type<infer U>] ? [Type<U>] : Type<T>;

class Operator<T> {
  public symbol!: string;
  public findOperator!: (value: T) => FindOperator<T>;
  public description!: (name: string, not: boolean) => string;
  public type!: OperatorType<T>;

  constructor(operator: Operator<T>) {
    Object.assign(this, operator);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filterOperators: Array<Operator<any>> = [
  new Operator({
    symbol: '',
    findOperator: (value) => Equal(value),
    description: (name, not) =>
      `${name} ${not ? 'not equal' : 'equal'} to value`,
    type: Object,
  }),
  new Operator({
    symbol: 'startsWith',
    findOperator: (value) => Like(`${value}%`),
    description: (name, not) =>
      `${name} ${not ? 'does not start' : 'starts'} with value`,
    type: String,
  }),
  new Operator({
    symbol: 'startsWith.i',
    findOperator: (value) => ILike(`${value}%`),
    description: (name, not) =>
      `${name} ${
        not ? 'does not start' : 'starts'
      } with value (case-insensitive)`,
    type: String,
  }),
  new Operator({
    symbol: 'endsWith',
    findOperator: (value) => Like(`%${value}`),
    description: (name, not) =>
      `${name} ${not ? 'does not end' : 'ends'} with value`,
    type: String,
  }),
  new Operator({
    symbol: 'endsWith.i',
    findOperator: (value) => ILike(`%${value}`),
    description: (name, not) =>
      `${name} ${not ? 'does not end' : 'ends'} with value (case-insensitive)`,
    type: String,
  }),
  new Operator({
    symbol: 'contains',
    findOperator: (value) => Like(`%${value}%`),
    description: (name, not) =>
      `${name} ${not ? 'does not contain' : 'contains'} value`,
    type: String,
  }),
  new Operator({
    symbol: 'contains.i',
    findOperator: (value) => ILike(`%${value}%`),
    description: (name, not) =>
      `${name} ${
        not ? 'does not contain' : 'contains'
      } value (case-insensitive)`,
    type: String,
  }),
  new Operator({
    symbol: 'gt',
    findOperator: (value) => MoreThan(value),
    description: (name, not) =>
      `${name} ${not ? 'not greater' : 'greater'} than`,
    type: Number,
  }),
  new Operator({
    symbol: 'gte',
    findOperator: (value) => MoreThanOrEqual(value),
    description: (name, not) =>
      `${name} ${not ? 'not greater' : 'greater'} than or equal to`,
    type: Number,
  }),
  new Operator({
    symbol: 'lt',
    findOperator: (value) => LessThan(value),
    description: (name, not) => `${name} ${not ? 'not less' : 'less'} than`,
    type: Number,
  }),
  new Operator({
    symbol: 'lte',
    findOperator: (value) => LessThanOrEqual(value),
    description: (name, not) =>
      `${name} ${not ? 'not less' : 'less'} than or equal to`,
    type: Number,
  }),
  new Operator({
    symbol: 'in',
    findOperator: (values) => In(values),
    description: (name, not) => `${name} ${not ? 'not in' : 'in'}`,
    type: [Object],
  }),
];

function toQueryParamName(
  key: string | symbol,
  operatorName: string,
  not = false
) {
  const sign = not ? '-' : '';
  const operator = operatorName && `.${operatorName}`;
  return sign + String(key) + operator;
}

export type CaliobaseFindOptions<TEntity> = {
  where: FindOptionsWhere<TEntity>;
  order?: FindOptionsOrder<TEntity>;
  select?: (keyof TEntity & string)[];
};

export type ToFindOptions<TEntity> = {
  listPublic?: boolean;
  toFindOptions: () => CaliobaseFindOptions<TEntity>;
  orderBy?: string[];
  [key: string]: unknown;
};

function extractArrayType<T>(typeOrArrayOf: T | T[]) {
  if (Array.isArray(typeOrArrayOf)) {
    return typeOrArrayOf[0];
  }
  return typeOrArrayOf;
}
function matchArrayness<TLeader, TFollower>(
  typeOrArrayOf: TLeader | TLeader[],
  propertyType: TFollower
) {
  if (Array.isArray(typeOrArrayOf)) {
    return [propertyType];
  }
  return propertyType;
}

export function createFindManyQueryParamClass<TEntity>(
  entityType: Type<TEntity>
): Type<ToFindOptions<TEntity>> {
  const keys = QueryProperty.getKeys(entityType.prototype);

  @RenameClass(entityType)
  class FindManyParams implements ToFindOptions<TEntity> {
    toFindOptions() {
      const where: FindOptionsWhere<TEntity> = {};

      keys.forEach(({ key }) => {
        filterOperators.forEach(({ symbol, findOperator }) => {
          const queryParamName = toQueryParamName(key, symbol);
          const queryParamNotName = toQueryParamName(key, symbol, true);

          if (this[queryParamName] != null) {
            where[key as keyof TEntity] = findOperator(
              this[queryParamName]
            ) as FindOptionsWhereProperty<NonNullable<TEntity[keyof TEntity]>>;
          }
          if (this[queryParamNotName] != null) {
            where[key as keyof TEntity] = Not(
              findOperator(this[queryParamNotName])
            ) as FindOptionsWhereProperty<NonNullable<TEntity[keyof TEntity]>>;
          }
        });
      });

      const orderBy: FindOptionsOrder<TEntity> = {};

      (
        this.orderBy ??
        CaliobaseEntity.get(entityType)?.controller?.defaultOrderBy
      )?.forEach((order) => {
        const [key, direction] = order.split('.') as [keyof TEntity, string];
        const orderDirection = direction.toUpperCase() as 'ASC' | 'DESC';
        orderBy[key] = orderDirection as FindOptionsOrderProperty<
          NonNullable<TEntity[keyof TEntity]>
        >;
      });

      const findManyOptions: CaliobaseFindOptions<TEntity> = {
        where,
        order: orderBy,
        select: this.select,
      };

      return findManyOptions;
    }
  }

  interface FindManyParams {
    orderBy?: string[];
    select?: (keyof TEntity & string)[];
    [key: string]: unknown;
  }

  keys.forEach(({ key, type: propertyType }) => {
    filterOperators
      .filter(
        ({ type: operatorType }) =>
          extractArrayType(operatorType) === propertyType ||
          extractArrayType(operatorType) === Object
      )
      .forEach(({ symbol: symbol, description, type: operatorType }) => {
        const queryParamName = toQueryParamName(key, symbol);
        const queryParamNotName = toQueryParamName(key, symbol, true);

        const each = Array.isArray(operatorType) ? true : false;

        const classTransformerValidatorTypeDecorators =
          propertyType === Number
            ? [TypeDecorator(() => Number, {}), IsNumber({}, { each })]
            : [IsString({ each })];

        Reflect.decorate(
          [
            ...classTransformerValidatorTypeDecorators,
            IsOptional(),
            ApiPropertyOptional({
              type:
                extractArrayType(operatorType) !== Object
                  ? operatorType
                  : matchArrayness(operatorType, propertyType),
              description: description(String(key), false),
            }),
          ],
          FindManyParams.prototype,
          queryParamName,
          void 0
        );

        Reflect.decorate(
          [
            ...classTransformerValidatorTypeDecorators,
            IsOptional(),
            ApiPropertyOptional({
              type:
                extractArrayType(operatorType) !== Object
                  ? operatorType
                  : matchArrayness(operatorType, propertyType),
              description: description(String(key), true),
            }),
          ],
          FindManyParams.prototype,
          queryParamNotName,
          void 0
        );
      });
  });

  const orderParams = keys.flatMap(({ key }) => [
    `${String(key)}.asc`,
    `${String(key)}.desc`,
  ]);

  Reflect.decorate(
    [
      IsIn(orderParams, { each: true }),
      IsOptional(),
      ApiPropertyOptional({
        type: [String],
        enum: orderParams,
      }),
    ],
    FindManyParams.prototype,
    'orderBy',
    void 0
  );

  const selectableFields = getMetadataArgsStorage()
    .columns.filter((col) => col.target === entityType)
    .map((col) => col.propertyName);

  Reflect.decorate(
    [
      IsIn(selectableFields, { each: true }),
      IsOptional(),
      ApiPropertyOptional({
        type: [String],
        enum: selectableFields,
      }),
    ],
    FindManyParams.prototype,
    'select',
    void 0
  );

  return FindManyParams;
}
