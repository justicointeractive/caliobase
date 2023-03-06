import { get } from 'lodash';
import { Fragment } from 'react';
import { ContentField } from '../lib';

export function Fieldset<T extends Record<string, unknown>>(props: {
  fields: ContentField<any, any, any>[];
  item: T;
  onChange: (value: T) => void;
}) {
  return (
    <>
      {props.fields.map((f) => (
        <Fragment key={f.property}>
          {f.editor?.({
            field: f,
            item: props.item,
            value: get(props.item, f.property),
            onChange: (e) => {
              props.onChange({ ...props.item, [f.property]: e });
            },
            options: f.editorOptions,
            readOnly: f.readOnly,
          })}
        </Fragment>
      ))}
    </>
  );
}
