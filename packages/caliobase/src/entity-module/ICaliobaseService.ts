import { Type } from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';

import { CaliobaseFindOptions } from '.';
import { CaliobaseRequestUser } from '../auth';

export interface ICaliobaseServiceOptions {
  organization?: { id: string };
  user: CaliobaseRequestUser;
}

export interface ICaliobaseService<TEntity, TCreate, TUpdate> {
  create(create: TCreate, options: ICaliobaseServiceOptions): Promise<TEntity>;
  findAll(
    listOptions: CaliobaseFindOptions<TEntity>,
    options: ICaliobaseServiceOptions
  ): Promise<{ items: TEntity[]; total: number }>;
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
  new (dataSource: DataSource): ICaliobaseService<TEntity, TCreate, TUpdate>;
  Entity: Type<TEntity>;
  CreateDto: Type<TCreate>;
  UpdateDto: Type<TUpdate>;
}
