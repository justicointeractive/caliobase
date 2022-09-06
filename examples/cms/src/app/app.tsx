import {
  CaliobaseUI,
  CaliobaseUiConfigurationBuilder,
  ContentFieldInput,
  TitleTextValueEditor,
} from '@caliobase/caliobase-ui';
import { Api } from '@caliobase/examples-client';
import { faObjectGroup } from '@fortawesome/free-regular-svg-icons';
import { ComponentProps } from 'react';

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
  .addEntity('example', {
    label: { singular: 'Example', plural: 'Examples' },
    fields: [idField, nameField],
    menuItemIcon: faObjectGroup,
  })
  .build();

export function App() {
  return <CaliobaseUI configuration={appConfig} routes={[]} />;
}

export default App;
