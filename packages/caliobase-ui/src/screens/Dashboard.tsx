import {
  faBars,
  faClose,
  faRightFromBracket,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { Suspense, useCallback, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Branding } from '../components/Branding';
import { PartialComponentApplication } from '../components/PartialComponentApplication';
import { useApiContext } from '../context';
import { useUserContext } from '../context/UserContext';
import { FullHeightLoader } from './FullScreenLoader';
import { MenuNavLink, MenuNavLinkPropsInput } from './MenuNavLink';

export function Dashboard(props: { appMenuItems: MenuNavLinkPropsInput[] }) {
  const [offcanvasOpen, setOffcanvasOpen] = useState(false);

  return (
    <div className="relative grid h-screen bg-gray-200 lg:grid-cols-[240px_1fr]">
      <MenuTriggerButton
        className="absolute left-2 top-2 lg:hidden"
        onClick={() => setOffcanvasOpen(true)}
      >
        <FontAwesomeIcon icon={faBars} />
      </MenuTriggerButton>
      {offcanvasOpen && (
        <button
          className="absolute inset-0 bg-gray-600/10"
          onClick={() => setOffcanvasOpen(false)}
        ></button>
      )}
      <div
        className={clsx(
          `absolute z-10 grid h-full w-[240px] grid-cols-1 grid-rows-[50px_1fr_50px] bg-gray-50 text-gray-600 shadow-lg transition lg:static`,
          offcanvasOpen ? `translate-x-0` : `-translate-x-full`,
          'lg:translate-x-0'
        )}
      >
        <MenuContent
          appMenuItems={props.appMenuItems}
          onCloseMenu={() => setOffcanvasOpen(false)}
        />
      </div>
      <div className="grid min-h-0 grid-cols-1 grid-rows-[50px_1fr_50px] overflow-hidden">
        <div className="bg-gray-200"></div>
        <div className="min-h-0 overflow-auto bg-gray-100">
          <Suspense fallback={<FullHeightLoader />}>
            <Outlet />
          </Suspense>
        </div>
        <div className="grid items-center bg-gray-200 p-3">
          <div className="text-right text-gray-400">Powered by Caliobase</div>
        </div>
      </div>
    </div>
  );
}

const MenuTriggerButton: PartialComponentApplication<'button'> = ({
  children,
  ...props
}) => (
  <button
    {...props}
    className={clsx(
      props.className,
      'h-8 w-8 rounded border border-gray-300 bg-gray-50'
    )}
  >
    {children}
  </button>
);

function MenuContent(props: {
  appMenuItems: MenuNavLinkPropsInput[];
  onCloseMenu: () => void;
}) {
  const { caliobaseUiConfiguration } = useApiContext();
  const { setAccessToken, user } = useUserContext();

  const onLogout = useCallback(() => {
    setAccessToken(null);
  }, [setAccessToken]);

  return (
    <>
      <div className="flex items-center gap-3 border-b p-3 text-sm font-bold">
        <MenuTriggerButton
          className="lg:hidden"
          onClick={() => props.onCloseMenu()}
        >
          <FontAwesomeIcon icon={faClose} />
        </MenuTriggerButton>
        <NavLink to="/">
          {/* TODO: how to select between organizations and create new ones? */}
          <Branding className="max-h-[3em] max-w-[12em] object-contain" />
        </NavLink>
      </div>
      <div className="grid content-start items-start gap-1 p-2 py-3 text-lg">
        {props.appMenuItems.map((item) => (
          <MenuNavLink key={item.to} {...item} onClick={props.onCloseMenu} />
        ))}
        <div className="px-2 pt-3 pb-0 text-xs font-bold text-gray-500">
          Content Management
        </div>
        {caliobaseUiConfiguration
          .listContentTypes()
          .map(
            (type) =>
              type.description.menuItemIcon && (
                <MenuNavLink
                  key={type.type}
                  label={type.description.label.plural}
                  icon={type.description.menuItemIcon}
                  to={`/content-editor/${type.type}`}
                  onClick={props.onCloseMenu}
                ></MenuNavLink>
              )
          )}
        <div className="px-2 pt-3 pb-0 text-xs font-bold text-gray-500">
          User Management
        </div>
        <MenuNavLink
          to="/users"
          label="Users"
          icon={faUser}
          onClick={props.onCloseMenu}
        />
      </div>
      <div className="flex items-center border-t text-left font-bold">
        <div className="flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap p-3 ">
          {user?.user.email}
        </div>
        <button className="p-3 hover:bg-gray-100" onClick={onLogout}>
          <FontAwesomeIcon icon={faRightFromBracket} />
        </button>
      </div>
    </>
  );
}
