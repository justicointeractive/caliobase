export function assert(value: unknown): asserts value {
  if (value == null) throw new Error(`value is null`);
}

export function asserted<T>(value: T | null | undefined): T {
  assert(value);
  return value;
}
