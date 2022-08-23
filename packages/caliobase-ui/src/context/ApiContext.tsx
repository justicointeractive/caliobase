import { faClose } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { BrowserRouter, RouteObject, useRoutes } from 'react-router-dom';
import { useAsyncEffectState } from 'use-async-effect-state';
import { CaliobaseUiConfiguration } from '../lib';
import { mergeRouteTrees } from '../lib/mergeRouteTrees';
import { ICaliobaseApi, ICaliobaseRootResponse } from '../lib/types';
import {
  AcceptInvitationView,
  CreateRoot,
  Dashboard,
  DetailView,
  ListView,
  Login,
  OrganizationMemberDetailView,
  OrganizationMemberListView,
} from '../screens';
import { MenuNavLinkPropsInput } from '../screens/MenuNavLink';
import { ToastContextProvider } from './ToastContext';
import { UserContextProvider, useUserContext } from './UserContext';

export type ApiContext = {
  caliobaseUiConfiguration: CaliobaseUiConfiguration<any>;
  api: ICaliobaseApi;
  root: ICaliobaseRootResponse;
  reloadRoot: () => void;
};

const ApiContext = createContext<ApiContext>(null!);

export function useApiContext() {
  return useContext(ApiContext);
}

export function CaliobaseUI({
  configuration: caliobaseUiConfiguration,
  routes: appRoutes,
  menuItems,
}: {
  configuration: CaliobaseUiConfiguration<any>;
  routes: RouteObject[];
  menuItems?: MenuNavLinkPropsInput[];
}) {
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

  const routes = useMemo(() => {
    const defaultRoutes: RouteObject[] = [
      {
        path: '/invitation',
        element: <AcceptInvitationView />,
      },
      {
        path: '/',
        element: <Dashboard appMenuItems={menuItems ?? []} />,
        children: [
          {
            path: '/content-editor/:contentType',
            element: <ListView />,
          },
          {
            path: '/content-editor/:contentType/create',
            element: <DetailView />,
          },
          {
            path: '/content-editor/:contentType/:itemId',
            element: <DetailView />,
          },
          {
            path: '/users',
            element: <OrganizationMemberListView />,
          },
          {
            path: '/users/create',
            element: <OrganizationMemberDetailView />,
          },
          {
            path: '/users/:orgUserId',
            element: <OrganizationMemberDetailView />,
          },
        ],
      },
    ];
    return mergeRouteTrees(defaultRoutes, appRoutes);
  }, [appRoutes, menuItems]);

  return (
    <ToastContextProvider
      render={({ content, hide }) => (
        <div
          className={clsx(
            'mb-2 overflow-hidden rounded-lg border text-sm shadow-md',
            content.level === 'error'
              ? 'bg-red-700 text-red-50'
              : 'bg-gray-700 text-gray-50'
          )}
        >
          <div className="flex items-center">
            <div className="flex-1 px-2 py-1 text-xs font-bold">
              {content.title}
            </div>
            <button
              onClick={() => hide()}
              className="px-2 py-1 hover:bg-black/10"
            >
              <FontAwesomeIcon icon={faClose} />
            </button>
          </div>
          <div className="bg-gray-50 p-2 text-gray-600">{content.message}</div>
        </div>
      )}
    >
      <ApiContext.Provider value={context}>
        <UserContextProvider>
          <BrowserRouter>
            <RootUI routes={routes} />
          </BrowserRouter>
        </UserContextProvider>
      </ApiContext.Provider>
    </ToastContextProvider>
  );
}

function RootUI({ routes }: { routes: RouteObject[] }) {
  const { root, reloadRoot } = useApiContext();
  const { user } = useUserContext();

  const hasRoot = root != null;

  return user ? (
    <AppRoutes routes={routes} />
  ) : hasRoot ? (
    <Login />
  ) : (
    <CreateRoot onCreated={() => reloadRoot()} />
  );
}

function AppRoutes({ routes }: { routes: RouteObject[] }) {
  return useRoutes(routes);
}
