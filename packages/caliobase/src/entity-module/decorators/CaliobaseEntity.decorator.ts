import { applyDecorators, Controller, Type } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Entity, FindOptionsWhere } from 'typeorm';
import { CaliobaseJwtPayload } from '../../auth/jwt-payload';

const METADATA_KEY = Symbol('caliobase:entity');

export type CaliobaseEntityOptions<T> = {
  controller?: {
    name: string;
    defaultOrderBy?: string[];
  };
  accessPolicy?: PolicyStatements<T>;
};

export type PolicyStatements<T> = PolicyStatement<T>[];

export type PolicyStatementAction =
  | 'create'
  | 'get'
  | 'list'
  | 'update'
  | 'delete';

export type PolicyUserCondition = {
  [K in keyof CaliobaseJwtPayload]: NonNullable<
    CaliobaseJwtPayload[K]
  > extends (infer U)[]
    ? U
    : CaliobaseJwtPayload[K];
};

export type PolicyStatement<T> = {
  effect: 'allow' | 'deny';
  action: PolicyStatementAction[];
  users?: PolicyUserCondition;
  items?:
    | ((context: { user: CaliobaseJwtPayload }) => FindOptionsWhere<T>)
    | FindOptionsWhere<T>;
};

export const CaliobaseEntity = Object.assign(
  // eslint-disable-next-line @typescript-eslint/ban-types
  <TFunction>(
    options: CaliobaseEntityOptions<TFunction> = {}
  ): ((target: new (...args: any[]) => TFunction) => void) => {
    return applyDecorators(
      Entity(),
      ...(options.controller
        ? [
            Controller(options.controller.name),
            ApiTags(options.controller.name),
          ]
        : []),
      Reflect.metadata(METADATA_KEY, options)
    );
  },
  {
    get<T>(target: Type<unknown>) {
      return Reflect.getMetadata(METADATA_KEY, target) as
        | CaliobaseEntityOptions<T>
        | undefined;
    },
  }
);
