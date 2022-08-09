import { RequestUser } from './RequestUser';

export interface IManyToManyRelationController<TMany> {
  create(params: Partial<TMany>, req: RequestUser): Promise<void>;
  remove(params: Partial<TMany>, req: RequestUser): Promise<void>;
}
