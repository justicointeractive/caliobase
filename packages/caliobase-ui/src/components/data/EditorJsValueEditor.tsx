import type { EditorConfig, OutputData } from '@editorjs/editorjs';
import { lazy } from 'react';
import { DetailEditorComponent } from './DetailEditorComponent';

const LazyEditorJs = lazy(() => import('./EditorJs'));

export type EditorJsValueEditorOptions = {
  placeholder?: string;
  /**
   * Additional Editor.js tools declared by the host application.
   *
   * These are merged with Caliobase's built-in header/list/image/attaches
   * tools before the editor is created, allowing downstream sites to store and
   * edit custom block types in normal Editor.js output data.
   */
  tools?: NonNullable<EditorConfig['tools']>;
  defaultBlock?: EditorConfig['defaultBlock'];
  inlineToolbar?: EditorConfig['inlineToolbar'];
  tunes?: EditorConfig['tunes'];
  i18n?: EditorConfig['i18n'];
};

export const EditorJsValueEditor: DetailEditorComponent<
  OutputData,
  EditorJsValueEditorOptions
> = ({ value, field, options }) => {
  return (
    <div key={field.property}>
      <LazyEditorJs
        label={field.label}
        placeholder={options?.placeholder}
        defaultValue={value}
        field={field}
        tools={options?.tools}
        defaultBlock={options?.defaultBlock}
        inlineToolbar={options?.inlineToolbar}
        tunes={options?.tunes}
        i18n={options?.i18n}
      />
    </div>
  );
};
