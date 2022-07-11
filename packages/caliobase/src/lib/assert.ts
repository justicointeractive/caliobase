export function assert<T>(
  value: T | null | undefined | false | '',
  message = `assertion failed, ${value} is falsey`,
  error = Error
): asserts value {
  if (!value) throw new error(message);
}
