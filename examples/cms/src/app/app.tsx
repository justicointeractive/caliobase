import {
  CaliobaseUI,
  CaliobaseUiConfigurationBuilder,
  ContentFieldInput,
  EditorJsValueEditor,
  TextValueEditor,
  TitleTextValueEditor,
} from '@caliobase/caliobase-ui';
import { Api } from '@caliobase/examples-client';
import type { OutputData } from '@editorjs/editorjs';
import { faObjectGroup } from '@fortawesome/free-regular-svg-icons';
import { faTents } from '@fortawesome/free-solid-svg-icons';
import { ComponentProps } from 'react';
import { RouteObject } from 'react-router-dom';
import { TestDialog } from './test-dialog';

const idField: ContentFieldInput<'id', string, unknown> = {
  label: 'Id',
  property: 'id',
  readOnly: true,
  defaultValue: () => null,
  editor: null,
  tableCell: null,
};

const nameField: ContentFieldInput<'name', string, ComponentProps<'input'>> = {
  label: 'Name',
  property: 'name',
  defaultValue: () => '',
  editor: TitleTextValueEditor,
  editorOptions: { placeholder: 'Add Name' },
};

const appConfig = new CaliobaseUiConfigurationBuilder(Api, {
  baseUrl: '',
  frontEndBaseUrl: '',
  preferredLoginMethod: 'password',
})
  .addMenuItem({
    label: 'Test Dialog',
    menuItemIcon: faTents,
    to: 'test-dialog',
  })
  .addProfileType('organizationProfile', {
    fields: [
      {
        label: 'Name',
        property: 'name',
        defaultValue: () => '',
        editor: TextValueEditor,
        editorOptions: { placeholder: 'Organization Name' },
      },
    ],
  })
  .addProfileType('userProfile', {
    fields: [
      {
        label: 'First Name',
        property: 'firstName',
        defaultValue: () => '',
        editor: TextValueEditor,
        editorOptions: { placeholder: 'First Name' },
      },
      {
        label: 'Last Name',
        property: 'lastName',
        defaultValue: () => '',
        editor: TextValueEditor,
        editorOptions: { placeholder: 'Last Name' },
      },
    ],
  })
  .addEntity('example', {
    label: { singular: 'Example', plural: 'Examples' },
    fields: [
      idField,
      nameField,
      {
        label: 'Content',
        property: 'blocks',
        defaultValue: (): OutputData => ({
          blocks: [],
        }),
        editor: EditorJsValueEditor,
        tableCell: null,
        editorOptions: { placeholder: 'Add Content' },
      },
    ],
    menuItemIcon: faObjectGroup,
  })
  .build();

const routes: RouteObject[] = [
  { path: '/', children: [{ path: 'test-dialog', element: <TestDialog /> }] },
];

export function App() {
  return <CaliobaseUI configuration={appConfig} routes={routes} />;
}

export default App;
