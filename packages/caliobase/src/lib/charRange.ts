import { range } from 'lodash';

export function charRange(start: string, end: string) {
  if (start.length > 1 || end.length > 1) {
    throw new Error(
      'expected start and end values to be strings of a single character'
    );
  }
  return range(start.charCodeAt(0), end.charCodeAt(0) + 1).map((charCode) =>
    String.fromCharCode(charCode)
  );
}
