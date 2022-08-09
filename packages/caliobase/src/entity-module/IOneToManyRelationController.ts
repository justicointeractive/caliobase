import {
  PaginationItemResponse,
  PaginationItemsResponse,
} from '../lib/envelopes';
import { RequestUser } from './RequestUser';

export interface IOneToManyRelationController<TMany> {
  create(
    body: Partial<TMany>,
    params: Partial<TMany>,
    req: RequestUser
  ): Promise<PaginationItemResponse<TMany>>;

  findAll(
    params: Partial<TMany>,
    req: RequestUser
  ): Promise<PaginationItemsResponse<TMany>>;

  findOne(
    params: Partial<TMany>,
    req: RequestUser
  ): Promise<PaginationItemResponse<TMany>>;

  update(
    body: Partial<TMany>,
    params: Partial<TMany>,
    req: RequestUser
  ): Promise<PaginationItemsResponse<TMany>>;

  remove(
    params: Partial<TMany>,
    req: RequestUser
  ): Promise<PaginationItemsResponse<TMany>>;
}
