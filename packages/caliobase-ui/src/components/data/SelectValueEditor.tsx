import { ReactNode } from 'react';
import { SelectInput } from '../SelectInput';
import { DetailEditorComponent } from './DetailEditorComponent';

export const SelectValueEditor: DetailEditorComponent<
  string,
  {
    // also accept objects for ease in using typescript enums
    values: Record<number | string, string>;
    renderOption?: (value?: string) => ReactNode;
    valueKey?: (value?: string) => string;
  }
> = ({ value, field, onChange, options }) => (
  <SelectInput
    label={field.label}
    value={value}
    options={options?.values ?? {}}
    onChange={onChange}
    renderOption={options?.renderOption}
    readOnly={field.readOnly}
  />
);
