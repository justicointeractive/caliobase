import { FloatingTree } from '@floating-ui/react-dom-interactions';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import ModalContainer from 'react-modal-promise';
import { BrowserRouter } from 'react-router-dom';
import { useAsyncEffectState } from 'use-async-effect-state';
import { ApiContextProvider } from '../context/ApiContext';
import { UserContextProvider } from '../context/UserContext';
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
      <FloatingTree>
        <UserContextProvider showLoader={showLoader}>
          <BrowserRouter>{children}</BrowserRouter>
          <ModalContainer />
        </UserContextProvider>
      </FloatingTree>
    </ApiContextProvider>
  );
}
