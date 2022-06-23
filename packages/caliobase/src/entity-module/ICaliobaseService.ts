import { Type } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';

import { CaliobaseFindOptions } from '.';

export interface ICaliobaseServiceOptions {
  owner: { id: string };
}

export interface ICaliobaseService<TEntity, TCreate, TUpdate> {
  create(create: TCreate, options: ICaliobaseServiceOptions): Promise<TEntity>;
  findAll(
    listOptions: CaliobaseFindOptions<TEntity>,
    options: ICaliobaseServiceOptions
  ): Promise<TEntity[]>;
  findOne(
    findOptions: CaliobaseFindOptions<TEntity>,
    options: ICaliobaseServiceOptions
  ): Promise<TEntity | null>;
  update(
    conditions: FindOptionsWhere<TEntity>,
    update: TUpdate,
    options: ICaliobaseServiceOptions
  ): Promise<TEntity[]>;
  remove(
    conditions: FindOptionsWhere<TEntity>,
    options: ICaliobaseServiceOptions
  ): Promise<TEntity[]>;
}

export interface ICaliobaseServiceType<TEntity, TCreate, TUpdate> {
  new (...args: any[]): ICaliobaseService<TEntity, TCreate, TUpdate>;
  Entity: Type<TEntity>;
  CreateDto: Type<TCreate>;
  UpdateDto: Type<TUpdate>;
}
