import { RoleDetailEditor } from '../components/data/RoleDetailEditor';
import { StringTableCell } from '../components/data/TableCellComponent';
import { TextValueEditor } from '../components/data/TextValueEditor';
import { ContentField, ContentFieldInput } from './types';

type RequiredKeys<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type RequiredContentFields = RequiredKeys<ContentFieldInput<string, any, any>>;

export const defaultFieldValues: Omit<
  ContentField<any, any, any>,
  RequiredContentFields
> = {
  readOnly: false,
  required: false,
  editor: TextValueEditor,
  validator: async () => null,
  editorColumn: 'main',
  editorOptions: {},
  tableCell: { component: StringTableCell },
};

export const rolesField: ContentField<'roles', string[], unknown> = {
  ...defaultFieldValues,
  label: 'Roles',
  property: 'roles',
  defaultValue: () => null,
  editor: RoleDetailEditor,
};

export const userEmailField: ContentField<'email', string, unknown> = {
  ...defaultFieldValues,
  label: 'Email',
  property: 'email',
  readOnly: true,
  defaultValue: () => '',
};
