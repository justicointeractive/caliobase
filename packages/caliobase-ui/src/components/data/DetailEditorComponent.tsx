import { parseISO } from 'date-fns';
import { kebabCase } from 'lodash';
import { ComponentProps, FunctionComponent } from 'react';
import {
  ContentField,
  formatDateTimeLocal,
  parseDateTimeLocal,
} from '../../lib';
import { ImageUpload } from '../ImageUpload';
import { TextInput, TextareaInput, TitleTextInput } from '../TextInput';

export type DetailEditorComponent<TValue, TOptions> = FunctionComponent<{
  item: Record<string, unknown>;
  value: TValue;
  isValid: boolean;
  // should this be a specific key for type inferrence?
  //  no, editors are for editors can be used to edit many fields of a certain data type
  field: ContentField<string, TValue, TOptions>;
  onChange: (value: TValue) => void;
  options?: TOptions;
  readOnly?: boolean;
}>;

export const TitleTextValueEditor: DetailEditorComponent<
  string,
  ComponentProps<'input'>
> = ({ value, field, isValid, onChange, options }) => (
  <TitleTextInput
    key={field.property}
    label={field.label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    isValid={isValid}
    readOnly={field.readOnly}
    {...options}
  />
);

export function slugify(titleCase: string) {
  return kebabCase(titleCase.replace(/&/g, ' and ').trim());
}

export const TextareaValueEditor: DetailEditorComponent<
  string,
  ComponentProps<'textarea'>
> = ({ value, field, isValid, onChange, options }) => (
  <TextareaInput
    key={field.property}
    label={field.label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    isValid={isValid}
    readOnly={field.readOnly}
    {...options}
  />
);

export const DateValueEditor: DetailEditorComponent<string | null, unknown> = ({
  value,
  field,
  isValid,
  onChange,
}) => (
  <TextInput
    key={field.property}
    label={field.label}
    required={field.required}
    type={'datetime-local'}
    value={value ? formatDateTimeLocal(parseISO(value)) : ''}
    onChange={(e) =>
      onChange(
        e.target.value ? parseDateTimeLocal(e.target.value).toISOString() : null
      )
    }
    isValid={isValid}
    readOnly={field.readOnly}
  />
);

export const ImageValueEditor: DetailEditorComponent<
  unknown | null,
  unknown
> = ({ value, field, isValid, onChange }) => (
  <ImageUpload
    key={field.property}
    image={value}
    onChange={onChange}
    field={field}
    isValid={isValid}
  />
);
