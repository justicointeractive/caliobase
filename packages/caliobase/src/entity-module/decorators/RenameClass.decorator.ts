import { Type } from '@nestjs/common';

export function RenameClass(
  type: Type<any> | string,
  replaceString = 'Entity'
): ClassDecorator {
  return (target) => {
    setEntityFunctionName(target, type, replaceString);
  };
}

function setEntityFunctionName<T>(
  // eslint-disable-next-line @typescript-eslint/ban-types
  fn: Function,
  type: Type<T> | string,
  replaceString: string
) {
  Object.defineProperty(fn, 'name', {
    value: getNamedEntityClassName<T>(fn, replaceString, type),
  });
}

export function getNamedEntityClassName<T>(
  // eslint-disable-next-line @typescript-eslint/ban-types
  fn: Function,
  replaceString: string,
  type: string | Type<T>
): string {
  return fn.name.replace(
    replaceString,
    typeof type === 'string' ? type : type.name
  );
}
