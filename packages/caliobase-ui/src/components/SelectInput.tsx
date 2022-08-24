import { faCircle } from '@fortawesome/free-regular-svg-icons';
import {
  faCaretDown,
  faCheckCircle,
  faClose,
  faPlus,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Float } from '@headlessui-float/react';
import { Combobox, Listbox } from '@headlessui/react';
import clsx from 'clsx';
import { without } from 'lodash';
import { ComponentProps, forwardRef, Key, ReactNode } from 'react';
import { ensureArray } from '../lib/ensureArray';
import { FullHeightLoader } from '../screens/FullScreenLoader';
import { LabeledInput } from './LabeledInput';

type BaseSelectInputProps<T> = {
  options: Record<string, T> | ArrayLike<T> | null;
  renderOption?: (value: T) => ReactNode;
  label?: string;
  readOnly?: boolean;
  valueKey?: (value: T) => Key;
  query?: string;
  onQuery?: (value: string) => void;
  onCreateFromQuery?: (value: string) => void;
};

type SelectMultipleInputProps<T> = BaseSelectInputProps<T> & {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
};

type SelectSingleInputProps<T> = BaseSelectInputProps<T> & {
  multiple?: false;
  value: T;
  onChange: (value: T) => void;
};

type SelectInputProps<T> =
  | SelectMultipleInputProps<T>
  | SelectSingleInputProps<T>;

export function SelectInput<T>({
  valueKey = (v) => v as unknown as Key,
  ...props
}: SelectInputProps<T>) {
  const { Wrapper } =
    props.onQuery == null
      ? {
          Wrapper: Listbox,
        }
      : {
          Wrapper: Combobox,
        };

  const values = props.options && Object.values(props.options ?? {});

  return (
    <LabeledInput value={props.value} label={props.label}>
      <Wrapper
        value={props.value}
        onChange={(value) => {
          // if an option has a value that is a function then call it rather than setting the new value
          for (const item of ensureArray(value)) {
            if (typeof item === 'function') {
              return item();
            }
          }

          return props.onChange(value as T & T[]);
        }}
        disabled={props.readOnly}
        multiple={props.multiple}
        by={(a: T | null, b: T | null) =>
          (a && valueKey(a)) === (b && valueKey(b))
        }
      >
        <Float
          flip={10}
          offset={4}
          enter="transition duration-200 ease-out"
          enterFrom="scale-95 opacity-0"
          enterTo="scale-100 opacity-100"
          leave="transition duration-150 ease-in"
          leaveFrom="scale-100 opacity-100"
          leaveTo="scale-95 opacity-0"
          tailwindcssOriginClass
          strategy="fixed"
          show
        >
          <Wrapper.Button
            className={({ open }) =>
              clsx(
                'flex min-w-[16rem] items-center gap-2 px-2 text-left transition-all'
              )
            }
          >
            <div className={clsx('flex-1', props.label ? 'pt-4 pb-1' : 'py-1')}>
              {props.multiple ? (
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  {props.value.map((value) => (
                    <div className="flex items-center rounded bg-indigo-200/50 text-indigo-800">
                      <div className="px-1">
                        {(props.renderOption ?? String)(value)}
                      </div>
                      <button
                        type="button"
                        className="rounded-r px-1 hover:bg-indigo-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onChange(without(props.value, value));
                        }}
                      >
                        <FontAwesomeIcon icon={faClose} />
                      </button>
                    </div>
                  ))}
                  {!props.value.length && <>&nbsp;</>}
                </div>
              ) : (
                (props.renderOption ?? String)(props.value) ?? <>&nbsp;</>
              )}
            </div>

            <FontAwesomeIcon icon={faCaretDown} />
          </Wrapper.Button>

          <Wrapper.Options
            as="div"
            className="z-10 flex max-h-[22rem] min-w-[16rem] flex-col overflow-hidden rounded border border-gray-300 bg-gray-100 shadow-lg"
          >
            {props.onQuery && (
              <div className={clsx('flex items-center gap-2 bg-gray-200 px-2')}>
                <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                <Combobox.Input
                  as={OverrideInputValue}
                  className={clsx(
                    'flex-1 py-1',
                    'rounded border bg-transparent outline-none'
                  )}
                  placeholder="Search..."
                  overrideValue={props.query}
                  onChange={(e) => props.onQuery?.(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 items-stretch overflow-auto p-1">
              {!values && (
                <FullHeightLoader
                  className="min-h-[2rem]"
                  spinnerClassName="h-5 w-5"
                />
              )}
              {values?.map((value) => (
                <Wrapper.Option
                  as="button"
                  type="button"
                  key={valueKey(value)}
                  value={value}
                  className={({ active }) =>
                    clsx(
                      'flex cursor-pointer items-center gap-2 rounded py-1 px-2 text-left',
                      active ? 'bg-indigo-700 text-indigo-50' : 'text-gray-600'
                    )
                  }
                >
                  {({ selected }) => (
                    <>
                      {props.multiple && (
                        <FontAwesomeIcon
                          icon={selected ? faCheckCircle : faCircle}
                        />
                      )}
                      <div className="flex-1">
                        {(props.renderOption ?? String)(value) ?? <>&nbsp;</>}
                      </div>
                    </>
                  )}
                </Wrapper.Option>
              ))}
              {values &&
                props.onCreateFromQuery &&
                props.query &&
                !values.some(
                  (v) => (v as { title?: string })?.title === props.query
                ) && (
                  <div
                    className={clsx(
                      'grid grid-cols-1',
                      values.length > 0 && 'mt-1 border-t-2 pt-1'
                    )}
                  >
                    <Wrapper.Option
                      as="button"
                      type="button"
                      value={() => props.onCreateFromQuery?.(props.query ?? '')}
                      className={({ active }) =>
                        clsx(
                          'cursor-pointer rounded py-1 px-2',
                          'flex items-center gap-2 text-left',
                          active
                            ? 'bg-indigo-700 text-indigo-50'
                            : 'text-gray-600'
                        )
                      }
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      <div className="flex-1">Create "{props.query}"</div>
                    </Wrapper.Option>
                  </div>
                )}
            </div>
          </Wrapper.Options>
        </Float>
      </Wrapper>
    </LabeledInput>
  );
}

const OverrideInputValue = forwardRef<
  HTMLInputElement,
  {
    overrideValue?: string;
  } & ComponentProps<'input'>
>(({ overrideValue, ...props }, ref) => {
  return <input ref={ref} {...props} autoFocus value={overrideValue} />;
});
