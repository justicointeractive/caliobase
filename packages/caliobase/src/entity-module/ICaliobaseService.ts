import { Type } from '@nestjs/common';
import { DataSource, DeepPartial, FindOptionsWhere } from 'typeorm';
import { CaliobaseRequestUser } from '../auth';
import { CaliobaseFindOptions } from './createFindManyQueryParamClass';

export interface ICaliobaseServiceOptions {
  organization: { id: string } | null;
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

export interface ICaliobaseServiceType<
  TEntity,
  TCreate extends DeepPartial<TEntity>,
  TUpdate extends DeepPartial<TEntity>
> {
  new (dataSource: DataSource): ICaliobaseService<TEntity, TCreate, TUpdate>;
  Entity: Type<TEntity>;
  CreateDto: Type<TCreate>;
  UpdateDto: Type<TUpdate>;
}
