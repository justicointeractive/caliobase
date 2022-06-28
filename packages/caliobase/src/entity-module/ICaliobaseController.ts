export interface ICaliobaseController<TEntity> {
  create(...args: unknown[]): Promise<{ item: TEntity }>;
  findAll(...args: unknown[]): Promise<{ items: TEntity[] }>;
  findOne(...args: unknown[]): Promise<{ item: TEntity | null }>;
  update(...args: unknown[]): Promise<{ items: TEntity[] }>;
  remove(...args: unknown[]): Promise<{ items: TEntity[] }>;
}
