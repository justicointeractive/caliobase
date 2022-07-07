import { applyDecorators, Type } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { CaliobaseJwtPayload } from '../../auth/jwt-payload';

const METADATA_KEY = Symbol('caliobase:access-policy-statements');

export type PolicyStatements<T> = PolicyStatement<T>[];

export type PolicyStatementAction =
  | 'create'
  | 'get'
  | 'list'
  | 'update'
  | 'delete';

export type PolicyUserCondition =
  | {
      role: string;
    }
  | ((payload: CaliobaseJwtPayload) => boolean);

export type PolicyStatement<T> = {
  effect: 'allow' | 'deny';
  action: '*' | PolicyStatementAction[];
  users?: PolicyUserCondition;
  items?:
    | ((context: { user: CaliobaseJwtPayload }) => FindOptionsWhere<T>)
    | FindOptionsWhere<T>;
};

export type EffectivePolicy<TEntity> = {
  effect: 'allow' | 'deny';
  itemFilters: FindOptionsWhere<TEntity>[];
};

export const AccessPolicies = Object.assign(
  // eslint-disable-next-line @typescript-eslint/ban-types
  <TFunction>(statements: PolicyStatements<TFunction> = []): ClassDecorator => {
    return applyDecorators(Reflect.metadata(METADATA_KEY, statements));
  },
  {
    get<T>(target: Type<unknown>) {
      return Reflect.getMetadata(METADATA_KEY, target) as
        | PolicyStatements<T>
        | undefined;
    },
  }
);
