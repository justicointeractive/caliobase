import { nonNull } from 'circumspect';

export type ParserProps = {
  required: <TValue>(
    key: string,
    converter: (value: string) => TValue
  ) => TValue;
  optional: <TValue, TDefault>(
    key: string,
    converter: (value: string) => TValue,
    defaultValue: TDefault
  ) => TValue | TDefault;
  matchMany: <T>(regex: RegExp, parser: Parser<T>) => T[];
  requireMatchOne: <T>(regex: RegExp, parser: Parser<T>) => T;
  optionalMatchOne: <T, TDefault>(
    regex: RegExp,
    parser: Parser<T>,
    defaultValue: TDefault
  ) => T | TDefault;
};

export type Parser<T> = (props: ParserProps) => T;

export function parseEnvVars<T>(parser: Parser<T>): T {
  const missingRequire: string[] = [];
  const missingOptional: string[] = [];

  const parsed = parseEnvVarsInternal(
    '',
    parser,
    missingRequire,
    missingOptional
  );

  if (missingRequire.length > 0) {
    console.error(
      `missing required ${
        missingRequire.length
      } env var(s): ${missingRequire.join(', ')}`
    );
    throw new Error('unable to parse config, see log for errors');
  }

  return parsed;
}

function parseEnvVarsInternal<T>(
  keyPrefix = '',
  parser: Parser<T>,
  missingRequire: string[],
  missingOptional: string[]
) {
  const { env } = process;

  function required<T>(key: string, converter: (value: string) => T): T {
    const value = env[keyPrefix + key];

    if (value == null) {
      missingRequire.push(String(keyPrefix + key));
      // we'll throw later... just pretend it's a T
      return null as unknown as T;
    }

    return converter(value);
  }

  function optional<T, TDefault>(
    key: string,
    converter: (value: string) => T,
    defaultValue: TDefault
  ): T | TDefault {
    const value = env[keyPrefix + key];

    if (value == null) {
      missingOptional.push(String(keyPrefix + key));
      return defaultValue;
    }

    return converter(value);
  }

  function matchMany<T>(regex: RegExp, parser: Parser<T>) {
    const matchExp = new RegExp('^' + keyPrefix + regex.source);

    return [
      ...new Set(
        Object.keys(env)
          .map((k) => k.match(matchExp))
          .filter(nonNull)
          .map(([fullMatch]) => fullMatch)
      ),
    ].map((fullMatch) => {
      return parseEnvVarsInternal(
        fullMatch,
        parser,
        missingRequire,
        missingOptional
      );
    });
  }

  function requireMatchOne<T>(regex: RegExp, parser: Parser<T>): T {
    const matches = matchMany(regex, parser);
    if (matches.length !== 1) {
      missingRequire.push(`${regex.source}*`);
    }
    return matches[0];
  }

  function optionalMatchOne<T, TDefault>(
    regex: RegExp,
    parser: Parser<T>,
    defaultValue: TDefault
  ): T | TDefault {
    const matches = matchMany(regex, parser);
    return matches[0] ?? defaultValue;
  }

  const parsed = parser({
    required,
    optional,
    matchMany,
    requireMatchOne,
    optionalMatchOne,
  });

  return parsed;
}

export function split<T>(converter: (v: string) => T, separator = ',') {
  return (v: string): T[] => v.split(separator).map(converter);
}
