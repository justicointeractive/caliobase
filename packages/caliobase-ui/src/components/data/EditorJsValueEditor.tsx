import type { OutputData } from '@editorjs/editorjs';
import { lazy } from 'react';
import { DetailEditorComponent } from './DetailEditorComponent';

const LazyEditorJs = lazy(() => import('./EditorJs'));

export type EditorJsValueEditorOptions = {
  placeholder?: string;
};

export const EditorJsValueEditor: DetailEditorComponent<
  OutputData,
  EditorJsValueEditorOptions
> = ({ value, field, options, onChange }) => {
  return (
    <div key={field.property}>
      <LazyEditorJs
        label={field.label}
        placeholder={options?.placeholder}
        defaultValue={value}
        onChange={onChange}
      />
    </div>
  );
};
