import { parseISO } from 'date-fns';
import { get } from 'lodash';
import { FunctionComponent } from 'react';
import { ensureArray } from '../../lib/ensureArray';
import { ContentField } from '../../lib/types';

export type TableCellComponent<TOptions> = FunctionComponent<{
  value: any;
  field: ContentField<string, any, any>;
  item: Record<string, any>;
  options: TOptions;
}>;

export const StringTableCell: TableCellComponent<{
  property?: string;
}> = ({ value, options }) => (
  <div className="line-clamp-1">
    {String((options?.property ? get(value, options.property) : value) ?? '')}
  </div>
);

export const StringListTableCell: TableCellComponent<{ property?: string }> = ({
  value,
  options,
}) => {
  const [first, ...rest] = ensureArray(value).map((value) =>
    String(options?.property ? get(value, options.property) : value)
  );
  return (
    <div title={[first, ...rest].join(', ')}>
      <span>{first}</span>{' '}
      {rest.length > 0 && <span className="text-xs">+ {rest.length} more</span>}
    </div>
  );
};

export const LocaleDateTableCell: TableCellComponent<unknown> = ({ value }) => (
  <div>{value && parseISO(String(value)).toLocaleString()}</div>
);
