import { createContext, ReactNode, useContext } from 'react';
import { RouteObject, useRoutes } from 'react-router-dom';
import { CaliobaseUiConfiguration } from '../lib';
import { ICaliobaseApi } from '../lib/ICaliobaseApi';
import { ICaliobaseRootResponse } from '../lib/types';

export type ApiContext = {
  caliobaseUiConfiguration: CaliobaseUiConfiguration<any>;
  api: ICaliobaseApi;
  root?: ICaliobaseRootResponse;
  reloadRoot: () => void;
  setShowAuthModal?: (value: boolean) => void;
};

const ApiContext = createContext<ApiContext>(null!);

export function useApiContext() {
  return useContext(ApiContext);
}

export function AppRoutes({ routes }: { routes: RouteObject[] }) {
  return useRoutes(routes);
}

export function ApiContextProvider({
  children,
  context,
}: {
  children: ReactNode;
  context: ApiContext;
}) {
  return <ApiContext.Provider value={context}>{children}</ApiContext.Provider>;
}
