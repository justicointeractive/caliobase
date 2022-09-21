import { faClose } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { useMemo } from 'react';
import { RouteObject } from 'react-router-dom';
import { AppRoutes } from '../context/ApiContext';
import { ToastContextProvider } from '../context/ToastContext';
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
import { RootUI } from './RootUI';

export function CaliobaseUI<T extends ICaliobaseApi>({
  configuration: caliobaseUiConfiguration,
  routes: appRoutes,
  menuItems,
}: {
  configuration: CaliobaseUiConfiguration<T>;
  routes: RouteObject[];
  menuItems?: MenuNavLinkPropsInput[];
}) {
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
      <RootUI
        configuration={caliobaseUiConfiguration}
        loggedIn={<AppRoutes routes={routes} />}
        anonymous={<Login />}
        createRoot={<CreateRoot />}
      />
    </ToastContextProvider>
  );
}
