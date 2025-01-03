import clsx from 'clsx';
import { ReactElement, useState } from 'react';
import { clsxo } from '../lib/clsxo';

export function LabeledInput<TValue>({
  value,
  label,
  placeholder,
  isValid = true,
  children,
}: {
  value: TValue;
  label?: string;
  placeholder?: string;
  isValid?: boolean;
  children: ReactElement<{ readOnly?: boolean; disabled?: boolean }>;
}) {
  const [focus, setFocus] = useState(false);

  const showLargeLabel = !value && !focus;

  const isEditable = !children.props.readOnly && !children.props.disabled;

  return (
    <div
      className={clsxo(
        'group relative grid',
        !isValid
          ? 'border-red-500 [--bg:theme(colors.red.50)] [--ring:theme(colors.red.500)]'
          : !isEditable
          ? '[--bg:theme(colors.gray.100)] [--ring:theme(colors.gray.300)]'
          : '[--bg:theme(colors.gray.50)] [--ring:theme(colors.indigo.500)] hover:[--bg:theme(colors.indigo.50)]',
        'bg-[color:var(--bg)]',
        'transition-all',
        'rounded border',
        'focus-within:ring-1 focus-within:ring-[color:var(--ring)]'
      )}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
    >
      <div className="relative grid">{children}</div>
      <label
        className={clsx(
          'pointer-events-none absolute bg-[color:var(--bg)] font-bold ',
          'transition-all',
          !isValid ? 'text-red-800' : 'text-gray-500',
          showLargeLabel
            ? 'left-2 top-[calc(0.5em+0.125em)] opacity-0'
            : 'left-2 top-1 text-xs'
        )}
      >
        {label}
      </label>
      <label
        className={clsx(
          'pointer-events-none absolute bg-[color:var(--bg)] font-bold',
          'transition-all',
          !isValid ? 'text-red-800' : 'text-gray-500',
          showLargeLabel
            ? 'left-2 top-[calc(0.5em+0.125em)]'
            : 'left-2 top-1 text-xs opacity-0'
        )}
      >
        {placeholder || label}
      </label>
    </div>
  );
}
