export interface ICaliobaseController<TEntity> {
  create(...args: unknown[]): Promise<TEntity>;
  findAll(...args: unknown[]): Promise<TEntity[]>;
  findOne(...args: unknown[]): Promise<TEntity | null>;
  update(...args: unknown[]): Promise<TEntity[]>;
  remove(...args: unknown[]): Promise<TEntity[]>;
}
