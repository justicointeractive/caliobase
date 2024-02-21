import { Schema as NrwlReactSchema } from '@nx/react/src/generators/application/schema';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UiGeneratorSchema
  extends Pick<NrwlReactSchema, 'name' | 'tags' | 'directory'> {}
