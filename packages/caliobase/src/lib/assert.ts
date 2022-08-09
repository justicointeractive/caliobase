export function assert<T>(
  value: T,
  error: new (message?: string) => Error = Error,
  message = `assertion failed, ${value} is falsey`
): asserts value {
  if (!value) throw new error(message);
}

export function assertEqual<T>(expected: T, actual: T) {
  assert(
    expected === actual,
    undefined,
    `expected '${expected}' to equal '${actual}'`
  );
}
