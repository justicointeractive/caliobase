import { ComponentProps } from 'react';
import { TextInput } from '../TextInput';
import { DetailEditorComponent } from './DetailEditorComponent';

export const TextValueEditor: DetailEditorComponent<
  string,
  ComponentProps<'input'>
> = ({ value, field, onChange, options }) => (
  <TextInput
    key={field.property}
    label={field.label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    readOnly={field.readOnly}
    {...options}
  />
);
