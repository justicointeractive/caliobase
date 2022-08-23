import { ComponentProps } from 'react';

export type PartialComponentApplication<T extends keyof JSX.IntrinsicElements> =
  ({ children, ...props }: Partial<ComponentProps<T>>) => JSX.Element;
