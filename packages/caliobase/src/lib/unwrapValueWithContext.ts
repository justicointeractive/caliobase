export function unwrapValueWithContext<
  TContext extends Record<string, unknown>,
  TValue extends Record<string, unknown>
>(accessor: ((context: TContext) => TValue) | TValue, context: TContext) {
  return typeof accessor === 'function' ? accessor(context) : accessor;
}
