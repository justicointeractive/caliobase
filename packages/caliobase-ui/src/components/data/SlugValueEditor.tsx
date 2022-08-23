import { ComponentProps, useState } from 'react';
import { TextInput } from '../TextInput';
import { DetailEditorComponent, slugify } from './DetailEditorComponent';

export const SlugValueEditor: DetailEditorComponent<
  string,
  ComponentProps<'input'> & { titleField: string }
> = ({ item, value, field, onChange, options }) => {
  const [hasBeenEdited, setHasBeenEdited] = useState<boolean>(!!value);

  const { titleField, ...passthroughProps } = options ?? {};

  const titleFieldValue = titleField && item[titleField];

  if (typeof titleFieldValue === 'string') {
    const slugifiedTitle = slugify(titleFieldValue);
    if (!hasBeenEdited && slugifiedTitle !== value) {
      onChange(slugifiedTitle);
    }
  }

  return (
    <TextInput
      key={field.property}
      label={field.label}
      value={value}
      onChange={(e) => {
        setHasBeenEdited(true);
        return onChange(e.target.value);
      }}
      readOnly={field.readOnly}
      {...passthroughProps}
    />
  );
};
