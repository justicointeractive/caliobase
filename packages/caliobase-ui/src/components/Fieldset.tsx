import { get } from 'lodash';
import { Fragment, useState } from 'react';
import { ContentField } from '../lib';

export function Fieldset<T extends Record<string, unknown>>(props: {
  fields: ContentField<any, any, any>[];
  item: T;
  onChange: (value: T) => void;
}) {
  return (
    <Fragment>
      {props.fields.map((f) => (
        <Field<T>
          key={f.property}
          field={f}
          item={props.item}
          onChange={props.onChange}
        />
      ))}
    </Fragment>
  );
}

function Field<T extends Record<string, unknown>>({
  field,
  item,
  onChange,
}: {
  field: ContentField<any, any, any>;
  item: T;
  onChange: (value: T) => void;
}) {
  const [validationErrors, setValidationErrors] = useState<
    { message: string }[] | null
  >(null);

  return (
    <div key={field.property} className="relative">
      {field.editor?.({
        field: field,
        item: item,
        value: get(item, field.property),
        isValid: !validationErrors,
        onChange: (e) => {
          onChange({ ...item, [field.property]: e });
          field
            .validator?.(e)
            .then((result) => {
              setValidationErrors(result);
            })
            .catch((error) => {
              setValidationErrors([{ message: error.message }]);
            });
        },
        options: field.editorOptions,
        readOnly: field.readOnly,
      })}
      {validationErrors && (
        <div className="absolute top-0 right-0 max-w-full rounded bg-red-500 py-1 px-2 text-xs text-white">
          {validationErrors.map((e) => (
            <div key={e.message}>{e.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
