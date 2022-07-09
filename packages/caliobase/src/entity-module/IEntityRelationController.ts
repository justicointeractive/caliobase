import {
  PaginationItemResponse,
  PaginationItemsResponse,
} from '../lib/envelopes';
import { RequestUser } from './RequestUser';

export interface IEntityRelationController<TMany> {
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
  ): Promise<PaginationItemResponse<TMany>>;

  remove(
    params: Partial<TMany>,
    req: RequestUser
  ): Promise<PaginationItemResponse<TMany>>;
}
