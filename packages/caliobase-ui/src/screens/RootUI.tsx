import { ReactElement, useCallback, useMemo, useState } from 'react';
import { useAsyncEffectState } from 'use-async-effect-state';
import { ApiContextProvider, useApiContext } from '../context/ApiContext';
import { UserContextProvider, useUserContext } from '../context/UserContext';
import { CaliobaseUiConfiguration, ICaliobaseApi } from '../lib';

export type RootUIProps<T extends ICaliobaseApi> = {
  configuration: CaliobaseUiConfiguration<T>;
} & RootUISwitchProps;

export function RootUI<T extends ICaliobaseApi>({
  configuration: caliobaseUiConfiguration,
  loggedIn,
  createRoot,
  anonymous,
}: RootUIProps<T>) {
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
    [api, caliobaseUiConfiguration, root, reloadRoot]
  );

  return (
    <ApiContextProvider context={context}>
      <UserContextProvider>
        <RootUISwitch
          loggedIn={loggedIn}
          anonymous={anonymous}
          createRoot={createRoot}
        />
      </UserContextProvider>
    </ApiContextProvider>
  );
}

export type RootUISwitchProps = {
  loggedIn?: ReactElement;
  anonymous?: ReactElement;
  createRoot?: ReactElement;
};

export function RootUISwitch({
  loggedIn,
  anonymous,
  createRoot,
}: RootUISwitchProps): ReactElement | null {
  const { root } = useApiContext();
  const { user } = useUserContext();

  const hasRoot = root?.hasRootMember !== false;

  return (user ? loggedIn : hasRoot ? anonymous : createRoot) ?? null;
}
