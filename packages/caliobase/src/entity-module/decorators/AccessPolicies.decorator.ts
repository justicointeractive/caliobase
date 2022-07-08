import { applyDecorators, Type } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { CaliobaseRequestUser } from '../../auth';
import { EntityActions, Role } from '../roles';

const METADATA_KEY = Symbol('caliobase:access-policy-statements');

export type PolicyStatements<T> = PolicyStatement<T>[];

export type PolicyUserCondition =
  | {
      role: Role | Role[];
    }
  | ((payload: CaliobaseRequestUser) => boolean);

export type PolicyStatement<T> = {
  effect: 'allow' | 'deny';
  action: '*' | EntityActions[];
  users?: PolicyUserCondition;
  items?:
    | ((context: { user: CaliobaseRequestUser }) => FindOptionsWhere<T>)
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
