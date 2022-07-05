import { applyDecorators, Controller, Type } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Entity } from 'typeorm';

const METADATA_KEY = Symbol('CaliobaseEntity');

export type CaliobaseEntityOptions = {
  controller?: {
    name: string;
    defaultOrderBy?: string[];
  };
};

export const CaliobaseEntity = Object.assign(
  (options: CaliobaseEntityOptions = {}): ClassDecorator => {
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
    get(target: Type<unknown>) {
      return Reflect.getMetadata(METADATA_KEY, target) as
        | CaliobaseEntityOptions
        | undefined;
    },
  }
);
