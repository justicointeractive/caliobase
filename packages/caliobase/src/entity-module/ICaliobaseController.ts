import { ICaliobaseService, ToFindOptions } from '.';
import { RequestUser } from './RequestUser';

export interface ICaliobaseController<TEntity> {
  service: ICaliobaseService<TEntity, Partial<TEntity>, Partial<TEntity>>;
  create(
    body: Partial<TEntity>,
    params: Partial<TEntity>,
    req: RequestUser
  ): Promise<{ item: TEntity }>;
  findAll(
    query: ToFindOptions<TEntity>,
    req: RequestUser
  ): Promise<{ items: TEntity[] }>;
  findOne(
    params: Partial<TEntity>,
    user: RequestUser
  ): Promise<{ item: TEntity | null }>;
  update(
    body: Partial<TEntity>,
    params: Partial<TEntity>,
    req: RequestUser
  ): Promise<{ items: TEntity[] }>;
  remove(
    params: Partial<TEntity>,
    req: RequestUser
  ): Promise<{ items: TEntity[] }>;
}
