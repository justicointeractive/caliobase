import { ReactElement, ReactNode, useCallback, useMemo, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAsyncEffectState } from 'use-async-effect-state';
import { ApiContextProvider, useApiContext } from '../context/ApiContext';
import { UserContextProvider, useUserContext } from '../context/UserContext';
import { CaliobaseUiConfiguration, ICaliobaseApi } from '../lib';

export type CaliobaseProvidersProps<T extends ICaliobaseApi> = {
  configuration: CaliobaseUiConfiguration<T>;
  children?: ReactNode;
  showLoader?: boolean;
};

export function CaliobaseProviders<T extends ICaliobaseApi>({
  configuration: caliobaseUiConfiguration,
  children,
  showLoader,
}: CaliobaseProvidersProps<T>) {
  const api = useMemo(
    () =>
      new caliobaseUiConfiguration.Api(caliobaseUiConfiguration.baseApiParams),
    [caliobaseUiConfiguration]
  );

  const [rootReloadId, setRootReloadId] = useState(0);
  const [root] = useAsyncEffectState(
    undefined,
    async (signal) => {
      return (await api.root.getRoot({ signal })).data;
    },
    [api, rootReloadId]
  );

  const reloadRoot = useCallback(() => {
    setRootReloadId((r) => r + 1);
  }, []);

  const context = useMemo(
    () => ({
      caliobaseUiConfiguration,
      api,
      root,
      reloadRoot,
    }),
    [caliobaseUiConfiguration, api, root, reloadRoot]
  );

  return (
    <ApiContextProvider context={context}>
      <UserContextProvider showLoader={showLoader}>
        <BrowserRouter>{children}</BrowserRouter>
      </UserContextProvider>
    </ApiContextProvider>
  );
}

export type RootUISwitchProps = {
  loggedIn?: ReactElement;
  anonymous?: ReactElement;
  createRoot?: ReactElement;
  authModal?: ReactElement;
};

export function RootUISwitch({
  loggedIn,
  anonymous,
  createRoot,
}: RootUISwitchProps): ReactElement | null {
  const { root } = useApiContext();
  const { user } = useUserContext();

  const hasRoot = root?.hasRootMember !== false;

  return (
    (user ? loggedIn : hasRoot ? anonymous : createRoot ?? anonymous) ?? null
  );
}
