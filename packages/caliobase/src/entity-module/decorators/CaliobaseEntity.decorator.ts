import {
  applyDecorators,
  Controller,
  ModuleMetadata,
  Type,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiTags } from '@nestjs/swagger';
import { Entity, EntityOptions, EntitySubscriberInterface } from 'typeorm';
import { EntityControllerConstructor } from '../createEntityController';
import { ICaliobaseController } from '../ICaliobaseController';
import { ICaliobaseServiceType } from '../ICaliobaseService';
import { AccessPolicies, PolicyStatements } from './AccessPolicies.decorator';

const METADATA_KEY = Symbol('caliobase:entity');

type EntitySubscriberInput<TEntity> = Omit<
  EntitySubscriberInterface<TEntity>,
  'listenTo'
>;

export type CaliobaseEntityOptions<TEntity> = {
  imports?: ModuleMetadata['imports'];
  entity?: EntityOptions;
  controller?: {
    name: string;
    defaultOrderBy?: string[];
    extend?: (
      controllerClass: EntityControllerConstructor<TEntity>,
      serviceClass: ICaliobaseServiceType<
        TEntity,
        Partial<TEntity>,
        Partial<TEntity>
      >
    ) => Type<ICaliobaseController<TEntity>>;
  };
  subscribers?: Array<
    | ((moduleRef: ModuleRef) => EntitySubscriberInput<TEntity>)
    | EntitySubscriberInput<TEntity>
  >;
  accessPolicy?: PolicyStatements<TEntity>;
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
