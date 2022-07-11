export function assert<T>(
  value: T,
  error: new (message?: string) => Error = Error,
  message = `assertion failed, ${value} is falsey`
): asserts value {
  if (!value) throw new error(message);
}
