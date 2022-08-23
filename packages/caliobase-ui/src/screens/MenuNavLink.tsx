import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { NavLink } from 'react-router-dom';

export function MenuNavLink(props: MenuNavLinkProps) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-1 rounded p-2 text-sm font-bold',
          !isActive
            ? 'text-gray-500 hover:bg-gray-100'
            : 'bg-indigo-100 text-indigo-700'
        )
      }
      onClick={props.onClick}
    >
      <FontAwesomeIcon className={clsx('h-4 w-4 p-1')} icon={props.icon} />
      {props.label}
    </NavLink>
  );
}

export type MenuNavLinkProps = {
  to: string;
  label: string;
  icon: IconDefinition;
  onClick: () => void;
};

export type MenuNavLinkPropsInput = {
  to: string;
  label: string;
  icon: IconDefinition;
};
