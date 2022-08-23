import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAsyncEffectState } from 'use-async-effect-state';
import { Branding } from '../components';
import { CancelationError } from '../components/CancelationError';
import { Fieldset } from '../components/Fieldset';
import { PendingButton } from '../components/PendingButton';
import { TextInput } from '../components/TextInput';
import { useApiContext } from '../context/ApiContext';
import { useToastContext } from '../context/ToastContext';
import { useUserContext } from '../context/UserContext';
import { createInstanceFromFields } from '../lib';
import { bearerToken } from '../lib/bearerToken';
import { promisePopup } from '../lib/promisePopup';
import { DescribeInvitation } from './AcceptInvitationView';

export function Login() {
  const navigate = useNavigate();
  const toast = useToastContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const claimInvitation = searchParams.get('token');

  const { api, caliobaseUiConfiguration, root } = useApiContext();
  const { setAccessToken } = useUserContext();

  const [showPasswordAuth, setShowPasswordAuth] = useState(
    caliobaseUiConfiguration.baseApiParams.preferredLoginMethod !== 'social'
  );

  const [mode, setMode] = useState<'login' | 'create'>(
    claimInvitation ? 'create' : 'login'
  );

  const showErr = useCallback(
    (err: any) => {
      if (err == null) {
        err = { message: 'Unknown error' };
      } else if (typeof err === 'string') {
        err = { message: err };
      } else if (typeof err?.error?.message === 'string') {
        err = err.error;
      }

      toast.show({
        message: err.message,
        ...(err instanceof CancelationError
          ? {
              level: 'info',
              title: 'Canceled',
            }
          : {
              level: 'error',
              title: 'Error',
            }),
      });
    },
    [toast]
  );

  const [invitation] = useAsyncEffectState(
    undefined,
    async (signal) => {
      const invitation = (
        await ((claimInvitation &&
          api.organization.getInvitation(claimInvitation, { signal })) ||
          null)
      )?.data;
      return invitation;
    },
    [api, claimInvitation]
  );

  const startSessionWithUserAccessToken = useCallback(
    async (userAccessToken: string, claimInvitation: string | null) => {
      const {
        data: { rootOrgId },
      } = await api.root.getRoot();

      if (claimInvitation) {
        await api.organization.claimInvitation(claimInvitation, {
          headers: { ...bearerToken(userAccessToken) },
        });
        navigate('/');
      }

      const {
        data: { accessToken: userOrgToken },
      } = await api.organization.getOrganizationToken(rootOrgId, {
        headers: { ...bearerToken(userAccessToken) },
      });

      setAccessToken(userOrgToken);
    },
    [api.root, api.organization, navigate, setAccessToken]
  );

  const handleSignInSSO = useCallback(
    async (provider: string) => {
      try {
        const {
          data: { authUrl, nonce },
        } = await api.auth.socialAuthUrl({
          provider,
        });

        const providerResponse = (await promisePopup(authUrl)) as {
          id_token?: string;
          access_token?: string;
        };

        const { id_token: providerIdToken, access_token: providerAccessToken } =
          providerResponse;

        const {
          data: { accessToken },
        } = await api.auth.socialValidate({
          provider,
          idToken: providerIdToken,
          accessToken: providerAccessToken,
          nonce,
        });

        await startSessionWithUserAccessToken(accessToken, null);
      } catch (err) {
        showErr(err);
        throw err;
      }
    },
    [api.auth, showErr, startSessionWithUserAccessToken]
  );

  const modeLabel = mode === 'create' ? 'Create account' : 'Log in';

  return (
    <div className="flex h-screen flex-col place-content-center place-items-center gap-3 bg-gray-200">
      <div className="m-auto grid w-[300px] gap-2">
        <Branding className="mb-4" />
        {invitation && (
          <div className="flex items-center gap-2 rounded bg-white p-2">
            <div className="flex-1 text-sm">
              <DescribeInvitation invitation={invitation} />
            </div>
            <div>
              <button
                className="rounded bg-gray-200 py-1 px-2 text-xs font-bold text-gray-600"
                onClick={() => setSearchParams({})}
              >
                Decline
              </button>
            </div>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="grid gap-3 rounded bg-white p-2"
        >
          {showPasswordAuth && (
            <PasswordLoginFormFragment
              {...{
                mode,
                modeLabel,
                startSessionWithUserAccessToken,
                claimInvitation,
                onError: showErr,
                onModeChange: setMode,
              }}
            />
          )}

          {root.socialProviders.map((provider) => (
            <PendingButton
              key={provider.name}
              className="rounded bg-indigo-700 p-3 font-bold text-white"
              onClick={async () => {
                await handleSignInSSO(provider.name);
              }}
            >
              {modeLabel} with {provider.label}
            </PendingButton>
          ))}
        </form>
        {!showPasswordAuth && (
          <button
            className="text-sm text-gray-500"
            onClick={() => setShowPasswordAuth(true)}
          >
            {modeLabel} with password
          </button>
        )}
      </div>
    </div>
  );
}

function PasswordLoginFormFragment(props: {
  mode: 'create' | 'login';
  onModeChange: (mode: 'create' | 'login') => void;
  modeLabel: string;
  claimInvitation: string | null;
  startSessionWithUserAccessToken: (
    userAccessToken: string,
    claimInvitation: string | null
  ) => Promise<void>;
  onError: (err: unknown) => void;
}) {
  const {
    mode,
    modeLabel,
    onModeChange,
    startSessionWithUserAccessToken,
    claimInvitation,
    onError,
  } = props;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { api, caliobaseUiConfiguration } = useApiContext();

  const userProfileFields = useMemo(() => {
    const fields = caliobaseUiConfiguration.getBuiltInFields('userProfile');
    return fields;
  }, [caliobaseUiConfiguration]);

  const [userProfile, setUserProfile] = useState(() =>
    createInstanceFromFields(userProfileFields)
  );

  const onLogin = useCallback(async () => {
    try {
      const {
        data: { accessToken: userAccessToken },
      } = await api.auth.loginUser({
        email,
        password,
      });

      await startSessionWithUserAccessToken(userAccessToken, claimInvitation);
    } catch (err) {
      onError(err);
      throw err;
    }
  }, [
    api.auth,
    email,
    password,
    onError,
    startSessionWithUserAccessToken,
    claimInvitation,
  ]);

  const onCreateAccount = useCallback(async () => {
    try {
      const {
        data: { accessToken: userAccessToken },
      } = await api.auth.createUserWithPassword({
        email,
        password,
        profile: userProfile,
      });

      await startSessionWithUserAccessToken(userAccessToken, claimInvitation);
    } catch (err) {
      onError(err);
      throw err;
    }
  }, [
    api.auth,
    email,
    password,
    userProfile,
    startSessionWithUserAccessToken,
    claimInvitation,
    onError,
  ]);

  const onForgotPassword = useCallback(async () => {
    await api.auth.emailResetToken({
      email,
    });
  }, [api, email]);

  return (
    <>
      <h2 className="text-center text-lg font-bold text-gray-600">
        {modeLabel}
      </h2>
      {mode === 'create' && (
        <Fieldset
          fields={userProfileFields}
          item={userProfile}
          onChange={setUserProfile}
        />
      )}
      <TextInput
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextInput
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {mode === 'login' && (
        <>
          <PendingButton
            type="submit"
            className="rounded bg-indigo-700 p-3 font-bold text-white"
            onClick={onLogin}
          >
            Log In
          </PendingButton>
          <button
            className="rounded px-2 py-1 text-indigo-600"
            onClick={onForgotPassword}
          >
            Forgot Password
          </button>
          {claimInvitation && (
            <button
              className="rounded px-2 py-1 text-gray-600"
              onClick={() => onModeChange('create')}
            >
              Create new account
            </button>
          )}
        </>
      )}
      {mode === 'create' && (
        <>
          <PendingButton
            type="submit"
            className="rounded bg-indigo-700 p-3 font-bold text-white"
            onClick={onCreateAccount}
          >
            Create Account
          </PendingButton>
          <button
            className="rounded px-2 py-1 text-gray-600"
            onClick={() => onModeChange('login')}
          >
            Log with an account
          </button>
        </>
      )}
    </>
  );
}
