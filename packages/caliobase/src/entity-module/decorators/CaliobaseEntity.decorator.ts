import { applyDecorators, Controller, Type } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Entity, EntityOptions } from 'typeorm';
import { AccessPolicies, PolicyStatements } from './AccessPolicies.decorator';

const METADATA_KEY = Symbol('caliobase:entity');

export type CaliobaseEntityOptions<T> = {
  entity?: EntityOptions;
  controller?: {
    name: string;
    defaultOrderBy?: string[];
  };
  accessPolicy?: PolicyStatements<T>;
  organizationOwner?: false;
};

export const CaliobaseEntity = Object.assign(
  // eslint-disable-next-line @typescript-eslint/ban-types
  <TFunction>(
    options: CaliobaseEntityOptions<TFunction> = {}
  ): ((target: new (...args: unknown[]) => TFunction) => void) => {
    return applyDecorators(
      Entity(options.entity),
      ...(options.controller
        ? [
            Controller(options.controller.name),
            ApiTags(options.controller.name),
          ]
        : []),
      ...(options.accessPolicy ? [AccessPolicies(options.accessPolicy)] : []),
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
