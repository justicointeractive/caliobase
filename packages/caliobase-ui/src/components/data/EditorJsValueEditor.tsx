import type { OutputData } from '@editorjs/editorjs';
import { lazy } from 'react';
import { DetailEditorComponent } from './DetailEditorComponent';

const LazyEditorJs = lazy(() => import('./EditorJs'));

export const EditorJsValueEditor: DetailEditorComponent<
  OutputData,
  unknown
> = ({ value, field, onChange }) => {
  return (
    <div key={field.property}>
      <LazyEditorJs defaultValue={value} onChange={onChange} />
    </div>
  );
};
