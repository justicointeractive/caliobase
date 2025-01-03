import clsx from 'clsx';
import { ComponentProps, createElement } from 'react';
import { LabeledInput } from './LabeledInput';

function createTextInput<T extends 'input' | 'textarea'>(
  as: T,
  componentProps?: ComponentProps<T>
) {
  return function TextInput({
    label,
    placeholder,
    isValid,
    ...props
  }: {
    label: string;
    isValid?: boolean;
  } & ComponentProps<T>) {
    return (
      <LabeledInput
        value={props.value}
        label={label}
        placeholder={placeholder}
        isValid={isValid}
      >
        {createElement(as, {
          ...componentProps,
          ...props,
          className: clsx(
            componentProps?.className,
            props?.className,
            'bg-transparent p-2 pt-4 pb-1',
            'outline-none'
          ),
        })}
      </LabeledInput>
    );
  };
}

export const TitleTextInput = createTextInput('input', {
  className: 'text-[1.5rem] font-bold',
});
export const TextInput = createTextInput('input');
export const TextareaInput = createTextInput('textarea');
