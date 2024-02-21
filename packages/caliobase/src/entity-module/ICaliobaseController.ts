import { DeepPartial } from 'typeorm';
import { ICaliobaseService, ToFindOptions } from '.';
import { RequestUser } from './RequestUser';

export interface ICaliobaseController<TEntity> {
  service: ICaliobaseService<
    TEntity,
    DeepPartial<TEntity>,
    DeepPartial<TEntity>
  >;

  create(
    body: DeepPartial<TEntity>,
    params: DeepPartial<TEntity>,
    req: RequestUser
  ): Promise<{ item: TEntity }>;
  findAll(
    query: ToFindOptions<TEntity>,
    req: RequestUser
  ): Promise<{ items: TEntity[] }>;
  findOne(
    params: DeepPartial<TEntity>,
    query: ToFindOptions<TEntity> | null,
    user: RequestUser
  ): Promise<{ item: TEntity | null }>;
  update(
    body: DeepPartial<TEntity>,
    params: DeepPartial<TEntity>,
    req: RequestUser
  ): Promise<{ items: TEntity[] }>;
  remove(
    params: DeepPartial<TEntity>,
    req: RequestUser
  ): Promise<{ items: TEntity[] }>;
}
