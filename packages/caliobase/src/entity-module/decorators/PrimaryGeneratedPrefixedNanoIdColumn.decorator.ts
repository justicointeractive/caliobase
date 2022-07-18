import { customAlphabet } from 'nanoid';
import { BeforeInsert, PrimaryColumn } from 'typeorm';
import { charRange } from '../../lib/charRange';
import { defineDecoratedMethod, Metadata } from '../../lib/Metadata';

const prefixedNanoIdColumnMetadata = new Metadata<{
  propertyName: string | symbol;
}>(Symbol('caliobase:PrimaryGeneratedPrefixedNanoIdColumn'));

// eslint-disable-next-line @typescript-eslint/ban-types
const usedIdPrefixes = new Map<string, Function>();

const nanoid = customAlphabet(
  [...charRange('0', '9'), ...charRange('A', 'Z'), ...charRange('a', 'z')].join(
    ''
  )
);

/**
 * Defines a PrimaryColumn that has a prefixed nanoid generated BeforeInsert
 */
export const PrimaryGeneratedPrefixedNanoIdColumn = Object.assign(
  function PrimaryGeneratedPrefixedNanoIdColumn(
    idPrefix: string,
    generateSuffix: () => string = () => nanoid()
  ): PropertyDecorator {
    return function (targetPrototype, key): void {
      const alreadyUsedBy = usedIdPrefixes.get(idPrefix);

      if (alreadyUsedBy) {
        throw new Error(
          `idPrefix ${idPrefix} is alread used by ${alreadyUsedBy}`
        );
      }

      usedIdPrefixes.set(idPrefix, targetPrototype.constructor);

      Reflect.decorate(
        [
          PrimaryColumn({
            type: String,
          }),
        ],
        targetPrototype,
        key
      );

      prefixedNanoIdColumnMetadata.define(
        { propertyName: key },
        targetPrototype.constructor
      );

      defineDecoratedMethod(
        [BeforeInsert()],
        function () {
          this[key] = this[key] ?? `${idPrefix}_${generateSuffix()}`;
        },
        targetPrototype,
        Symbol('caliobase:generateIdBeforeInsertHandler')
      );
    };
  },
  {
    // eslint-disable-next-line @typescript-eslint/ban-types
    get(target: string | Function) {
      return prefixedNanoIdColumnMetadata.get(target);
    },
  }
);
