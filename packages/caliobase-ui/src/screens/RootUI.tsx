import { ReactElement } from 'react';
import { useApiContext } from '../context/ApiContext';
import { useUserContext } from '../context/UserContext';

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
