import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { assert } from '../lib/assert';
import { bearerToken } from '../lib/bearerToken';
import { ICaliobaseApi } from '../lib/ICaliobaseApi';
import { CaliobaseMember } from '../lib/types';
import { FullScreenLoader } from '../screens/FullScreenLoader';
import { useApiContext } from './ApiContext';

export type UserContextProps = ReturnType<typeof useUserContextValue>;

const UserContext = createContext<UserContextProps>(null!);

export function useUserContext<TApi extends ICaliobaseApi = ICaliobaseApi>() {
  return useContext(UserContext) as Omit<UserContextProps, 'userOrgApi'> & {
    userOrgApi: TApi;
  };
}

export function UserContextProvider({
  children,
  showLoader,
}: {
  showLoader?: boolean;
  children: ReactNode;
}) {
  const value = useUserContextValue();
  const { root } = useApiContext();

  if (
    showLoader !== false &&
    (root == null || (value.accessToken == null) !== (value.user == null))
  ) {
    return <FullScreenLoader />;
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

function useUserContextValue() {
  const [accessToken, setAccessToken] = useState(localStorage['jwt'] ?? null);

  const { caliobaseUiConfiguration } = useApiContext();

  const [user, setUser] = useState<CaliobaseMember | null>(null);

  const [userOrgApi, setUserOrgApi] = useState<ICaliobaseApi | null>(null);

  useEffect(() => {
    (async () => {
      if (!accessToken) {
        setUser(null);
        setUserOrgApi(null);
      } else {
        const userOrgApi = new caliobaseUiConfiguration.Api({
          ...caliobaseUiConfiguration.baseApiParams,
          baseApiParams: {
            headers: { ...bearerToken(accessToken) },
          },
        });
        const { data: user } = await userOrgApi.auth.getMe();
        setUser(user);
        setUserOrgApi(userOrgApi);
      }
    })().catch((err) => console.error(err));
  }, [
    accessToken,
    caliobaseUiConfiguration.Api,
    caliobaseUiConfiguration.baseApiParams,
  ]);

  const value = useMemo(
    () => ({
      accessToken,
      setAccessToken(value: string | null) {
        setUser(null);
        setUserOrgApi(null);
        if (value == null) {
          localStorage.removeItem('jwt');
        } else {
          localStorage['jwt'] = value;
        }
        setAccessToken(value);
      },
      user,
      userOrgApi,
      uploadFile: async (file: File) => {
        assert(userOrgApi);
        await caliobaseUiConfiguration.uploadFile(userOrgApi, file);
      },
    }),
    [accessToken, caliobaseUiConfiguration, user, userOrgApi]
  );

  return value;
}
