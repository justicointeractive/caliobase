import clsx from 'clsx';
import { ReactElement, useState } from 'react';
import { clsxo } from '../lib/clsxo';

export function LabeledInput<TValue>({
  value,
  label,
  placeholder,
  children,
}: {
  value: TValue;
  label?: string;
  placeholder?: string;
  children: ReactElement<{ readOnly?: boolean; disabled?: boolean }>;
}) {
  const [focus, setFocus] = useState(false);

  const showLargeLabel = !value && !focus;

  const isEditable = !children.props.readOnly && !children.props.disabled;

  return (
    <div
      className={clsxo(
        'group relative grid',
        isEditable
          ? 'color-var-[bg_gray-50] hover:color-var-[bg_indigo-50] color-var-[ring_indigo-500]'
          : 'color-var-[bg_gray-100] color-var-[ring_gray-300]',
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
          'pointer-events-none absolute bg-[color:var(--bg)] font-bold text-gray-500',
          'transition-all',
          showLargeLabel
            ? 'left-2 top-[calc(0.5em+0.125em)] opacity-0'
            : 'left-2 top-1 text-xs'
        )}
      >
        {label}
      </label>
      <label
        className={clsx(
          'pointer-events-none absolute bg-[color:var(--bg)] font-bold text-gray-500',
          'transition-all',
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
