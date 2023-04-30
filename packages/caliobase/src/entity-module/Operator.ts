import { FindOperator } from 'typeorm';
import { OperatorType } from './createFindManyQueryParamClass';

export class Operator<T> {
  public symbol!: string;
  public findOperator!: (value: T) => FindOperator<T>;
  public description!: (name: string, not: boolean) => string;
  public types!: OperatorType<T>[];

  constructor(operator: Operator<T>) {
    Object.assign(this, operator);
  }
}
