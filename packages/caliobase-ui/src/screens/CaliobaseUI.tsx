import { faClose } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { BrowserRouter, RouteObject } from 'react-router-dom';
import { useAsyncEffectState } from 'use-async-effect-state';
import {
  ApiContextProvider,
  AppRoutes,
  useApiContext,
} from '../context/ApiContext';
import { ToastContextProvider } from '../context/ToastContext';
import { UserContextProvider, useUserContext } from '../context/UserContext';
import { CaliobaseUiConfiguration, ICaliobaseApi } from '../lib';
import { mergeRouteTrees } from '../lib/mergeRouteTrees';
import { AcceptInvitationView } from './AcceptInvitationView';
import { CreateRoot } from './CreateRoot';
import { Dashboard } from './Dashboard';
import { DetailView } from './DetailView';
import { ListView } from './ListView';
import { Login } from './Login';
import { MenuNavLinkPropsInput } from './MenuNavLink';
import {
  OrganizationMemberDetailView,
  OrganizationMemberListView,
} from './OrganizationMemberView';

export function RootUI({ routes }: { routes: RouteObject[] }) {
  const { root, reloadRoot } = useApiContext();
  const { user } = useUserContext();

  const hasRoot = root?.hasRootMember;

  return user ? (
    <AppRoutes routes={routes} />
  ) : hasRoot ? (
    <Login />
  ) : (
    <CreateRoot onCreated={() => reloadRoot()} />
  );
}

export function CaliobaseUI({
  configuration: caliobaseUiConfiguration,
  routes: appRoutes,
  menuItems,
}: {
  configuration: CaliobaseUiConfiguration<ICaliobaseApi>;
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
      <ApiContextProvider context={context}>
        <UserContextProvider>
          <BrowserRouter>
            <RootUI routes={routes} />
          </BrowserRouter>
        </UserContextProvider>
      </ApiContextProvider>
    </ToastContextProvider>
  );
}
