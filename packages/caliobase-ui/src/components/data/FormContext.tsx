import { remove } from 'lodash';
import { createContext, ReactNode, useContext, useMemo } from 'react';
import { ContentField } from '../../lib';

export type FormControl = {
  field: ContentField<any, any, any>;
  onBeforeSave: <T>(value: T, field: ContentField<any, any, any>) => Promise<T>;
};

export class FormContextValue {
  controls: FormControl[] = [];

  addFormControl(control: FormControl) {
    this.controls.push(control);

    return () => {
      remove(this.controls, control);
    };
  }

  async onBeforeSave<T>(value: T) {
    for (const control of this.controls) {
      value = await control.onBeforeSave(value, control.field);
    }
    return value;
  }
}

const FormContext = createContext<FormContextValue | null>(null);

export const FormContextProvider = (props: {
  children: (val: FormContextValue) => ReactNode;
}) => {
  const value = useMemo(() => new FormContextValue(), []);

  return (
    <FormContext.Provider value={value}>
      {props.children(value)}
    </FormContext.Provider>
  );
};

export const useFormContext = () => {
  const formContext = useContext(FormContext);
  if (formContext == null) {
    throw new Error('current control is not inside a form context');
  }
  return formContext;
};
