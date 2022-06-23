export interface ICaliobaseController<TEntity> {
  create(...args: any[]): Promise<TEntity>;
  findAll(...args: any[]): Promise<TEntity[]>;
  findOne(...args: any[]): Promise<TEntity | undefined>;
  update(...args: any[]): Promise<TEntity[]>;
  remove(...args: any[]): Promise<TEntity[]>;
}
