import { Type } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type as TransformType } from 'class-transformer';
import { IsDate, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  Equal,
  FindOptionsOrder,
  FindOptionsOrderProperty,
  FindOptionsWhere,
  FindOptionsWhereProperty,
  ILike,
  In,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
  getMetadataArgsStorage,
} from 'typeorm';
import { CaliobaseEntity, QueryProperty } from '.';
import { ensureArray } from '../lib/ensureArray';
import { Operator } from './Operator';
import { RenameClass } from './decorators/RenameClass.decorator';

export type OperatorType<T> = T extends [Type<infer U>] ? [Type<U>] : Type<T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filterOperators: Array<Operator<any>> = [
  new Operator({
    symbol: '',
    findOperator: (value) => Equal(value),
    description: (name, not) =>
      `${name} ${not ? 'not equal' : 'equal'} to value`,
    types: [Object],
  }),
  new Operator({
    symbol: 'startsWith',
    findOperator: (value) => Like(`${value}%`),
    description: (name, not) =>
      `${name} ${not ? 'does not start' : 'starts'} with value`,
    types: [String],
  }),
  new Operator({
    symbol: 'startsWith.i',
    findOperator: (value) => ILike(`${value}%`),
    description: (name, not) =>
      `${name} ${
        not ? 'does not start' : 'starts'
      } with value (case-insensitive)`,
    types: [String],
  }),
  new Operator({
    symbol: 'endsWith',
    findOperator: (value) => Like(`%${value}`),
    description: (name, not) =>
      `${name} ${not ? 'does not end' : 'ends'} with value`,
    types: [String],
  }),
  new Operator({
    symbol: 'endsWith.i',
    findOperator: (value) => ILike(`%${value}`),
    description: (name, not) =>
      `${name} ${not ? 'does not end' : 'ends'} with value (case-insensitive)`,
    types: [String],
  }),
  new Operator({
    symbol: 'contains',
    findOperator: (value) => Like(`%${value}%`),
    description: (name, not) =>
      `${name} ${not ? 'does not contain' : 'contains'} value`,
    types: [String],
  }),
  new Operator({
    symbol: 'contains.i',
    findOperator: (value) => ILike(`%${value}%`),
    description: (name, not) =>
      `${name} ${
        not ? 'does not contain' : 'contains'
      } value (case-insensitive)`,
    types: [String],
  }),
  // eslint-disable-next-line @typescript-eslint/ban-types
  new Operator<Number | Date>({
    symbol: 'gt',
    findOperator: (value) => MoreThan(value),
    description: (name, not) =>
      `${name} ${not ? 'not greater' : 'greater'} than`,
    types: [Number, Date],
  }),
  // eslint-disable-next-line @typescript-eslint/ban-types
  new Operator<Number | Date>({
    symbol: 'gte',
    findOperator: (value) => MoreThanOrEqual(value),
    description: (name, not) =>
      `${name} ${not ? 'not greater' : 'greater'} than or equal to`,
    types: [Number, Date],
  }),
  // eslint-disable-next-line @typescript-eslint/ban-types
  new Operator<Number | Date>({
    symbol: 'lt',
    findOperator: (value) => LessThan(value),
    description: (name, not) => `${name} ${not ? 'not less' : 'less'} than`,
    types: [Number, Date],
  }),
  // eslint-disable-next-line @typescript-eslint/ban-types
  new Operator<Number | Date>({
    symbol: 'lte',
    findOperator: (value) => LessThanOrEqual(value),
    description: (name, not) =>
      `${name} ${not ? 'not less' : 'less'} than or equal to`,
    types: [Number, Date],
  }),
  // eslint-disable-next-line @typescript-eslint/ban-types
  new Operator({
    symbol: 'in',
    findOperator: (values) => In(ensureArray(values)),
    // eslint-disable-next-line @typescript-eslint/ban-types
    description: (name, not) => `${name} ${not ? 'not in' : 'in'}`,
    types: [[Object]],
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
  limit?: number;
  skip?: number;
  order?: FindOptionsOrder<TEntity>;
  select?: (keyof TEntity & string)[];
  relations?: string[];
  loadEagerRelations?: boolean;
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

export type FindManyParams<TEntity> = {
  limit?: number;
  skip?: number;
  relations?: string[];
  orderBy?: string[];
  select?: (keyof TEntity & string)[];
};

export function createFindManyQueryParamClass<TEntity>(
  entityType: Type<TEntity>
): Type<ToFindOptions<TEntity>> {
  const queryableProperties = QueryProperty.getKeys(entityType.prototype);

  const entityColumns = getMetadataArgsStorage().columns.filter(
    (col) => col.target === entityType
  );

  @RenameClass(entityType)
  class FindManyParamsClass
    implements FindManyParams<TEntity>, ToFindOptions<TEntity>
  {
    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional()
    @TransformType(() => Number)
    limit?: number;

    @IsOptional()
    @IsNumber()
    @ApiPropertyOptional()
    @TransformType(() => Number)
    skip?: number;

    // TODO: generate an enum of all possible relations
    @IsOptional()
    @IsString({ each: true })
    @ApiPropertyOptional()
    @Transform(({ value }) => (value == null ? null : ensureArray(value)))
    relations?: string[];

    toFindOptions() {
      const controllerOptions = CaliobaseEntity.get(entityType)?.controller;

      const defaultFindParams = controllerOptions?.defaultFindParams || {};

      const thisWithDefaults = {
        ...this,
      };

      Object.entries(defaultFindParams).forEach(([key, value]) => {
        if (thisWithDefaults[key] == null) {
          thisWithDefaults[key] = value;
        }
      });

      const where: FindOptionsWhere<TEntity> = {};

      queryableProperties.forEach(({ key, operators }) => {
        [...filterOperators, ...operators].forEach(
          ({ symbol, findOperator }) => {
            const queryParamName = toQueryParamName(key, symbol);
            const queryParamNotName = toQueryParamName(key, symbol, true);

            if (thisWithDefaults[queryParamName] != null) {
              const operator = findOperator(
                thisWithDefaults[queryParamName]
              ) as FindOptionsWhereProperty<
                NonNullable<TEntity[keyof TEntity]>
              >;
              // TODO: clean up these `any`s
              where[key as keyof TEntity] = operator as any;
            }
            if (thisWithDefaults[queryParamNotName] != null) {
              const operator = Not(
                findOperator(thisWithDefaults[queryParamNotName])
              ) as FindOptionsWhereProperty<
                NonNullable<TEntity[keyof TEntity]>
              >;
              // TODO: clean up these `any`s
              where[key as keyof TEntity] = operator as any;
            }
          }
        );
      });

      const orderBy: FindOptionsOrder<TEntity> = {};

      (
        thisWithDefaults.orderBy ||
        controllerOptions?.defaultOrderBy ||
        null
      )?.forEach((order) => {
        // TODO: create more clear error message for invalid order by
        const [key, direction] = order.split('.') as [keyof TEntity, string];
        const orderDirection = direction.toUpperCase() as
          | 'ASC'
          | 'DESC' as FindOptionsOrderProperty<
          NonNullable<TEntity[keyof TEntity]>
        >;
        // TODO: clean up these `any`s
        orderBy[key] = orderDirection as any;
      });

      const findManyOptions: CaliobaseFindOptions<TEntity> = {
        where,
        order: orderBy,
        select: thisWithDefaults.select,
        limit: thisWithDefaults.limit,
        skip: thisWithDefaults.skip,
        relations: thisWithDefaults.relations,
        loadEagerRelations: thisWithDefaults.relations == null,
      };

      return findManyOptions;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface FindManyParamsClass extends FindManyParams<TEntity> {
    [key: string]: unknown;
  }

  queryableProperties.forEach(({ key, type: propertyType, operators }) => {
    [...filterOperators, ...operators]
      .map(({ types, ...operator }) => {
        const operatorType = types.find(
          (operatorType) =>
            extractArrayType(operatorType) === propertyType ||
            extractArrayType(operatorType) === Object
        );
        return { ...operator, operatorType };
      })
      .filter(({ operatorType }) => operatorType != null)
      .forEach(({ symbol: symbol, description, operatorType }) => {
        const queryParamName = toQueryParamName(key, symbol);
        const queryParamNotName = toQueryParamName(key, symbol, true);

        const each = Array.isArray(operatorType) ? true : false;

        const classTransformerValidatorTypeDecorators =
          propertyType === Number
            ? [TransformType(() => Number, {}), IsNumber({}, { each })]
            : propertyType === Date
            ? [TransformType(() => Date, {}), IsDate({ each })]
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
          FindManyParamsClass.prototype,
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
          FindManyParamsClass.prototype,
          queryParamNotName,
          void 0
        );
      });
  });

  const orderParams = queryableProperties.flatMap(({ key }) => [
    `${String(key)}.asc`,
    `${String(key)}.desc`,
  ]);

  Reflect.decorate(
    [
      Transform(({ value }) => (value == null ? null : ensureArray(value))),
      IsIn(orderParams, { each: true }),
      IsOptional(),
      ApiPropertyOptional({
        type: [String],
        enum: orderParams,
      }),
    ],
    FindManyParamsClass.prototype,
    'orderBy',
    void 0
  );

  const selectableFields = entityColumns.map((col) => col.propertyName);

  Reflect.decorate(
    [
      IsIn(selectableFields, { each: true }),
      IsOptional(),
      ApiPropertyOptional({
        type: [String],
        enum: selectableFields,
      }),
    ],
    FindManyParamsClass.prototype,
    'select',
    void 0
  );

  return FindManyParamsClass;
}
