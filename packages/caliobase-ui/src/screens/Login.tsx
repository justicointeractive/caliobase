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
import { CaliobaseOrganization, createInstanceFromFields } from '../lib';
import { bearerToken } from '../lib/bearerToken';
import { promisePopup } from '../lib/promisePopup';
import { DescribeInvitation } from './AcceptInvitationView';

export function LoginScreen() {
  return (
    <div className="flex h-screen flex-col place-content-center place-items-center gap-3 bg-gray-200">
      <Login />
    </div>
  );
}

export function useLogin() {
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

  const onError = useCallback(
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
    async (
      userAccessToken: string,
      organizationOrInvitation: CaliobaseOrganization | string | null
    ) => {
      if (typeof organizationOrInvitation === 'string') {
        organizationOrInvitation = (
          await api.organization.claimInvitation(organizationOrInvitation, {
            headers: { ...bearerToken(userAccessToken) },
          })
        ).data.organization;
        navigate('/');
      }

      let organizationId = organizationOrInvitation?.id;

      if (organizationId == null) {
        organizationId = (
          await api.auth.listUserMemberships({
            headers: { ...bearerToken(userAccessToken) },
          })
        ).data[0].organizationId;
      }

      const {
        data: { accessToken: userOrgToken },
      } = await api.organization.getOrganizationToken(organizationId, {
        headers: { ...bearerToken(userAccessToken) },
      });

      setAccessToken(userOrgToken);
    },
    [api.organization, api.auth, setAccessToken, navigate]
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
        onError(err);
        throw err;
      }
    },
    [api.auth, onError, startSessionWithUserAccessToken]
  );

  const modeLabel = mode === 'create' ? 'Create account' : 'Log in';

  const userProfileFields = useMemo(() => {
    const fields = caliobaseUiConfiguration.getBuiltInFields('userProfile');
    return fields;
  }, [caliobaseUiConfiguration]);

  const organizationProfileFields = useMemo(() => {
    const fields = caliobaseUiConfiguration.getBuiltInFields(
      'organizationProfile'
    );
    return fields;
  }, [caliobaseUiConfiguration]);

  const onLogin = useCallback(
    async (props: { email: string; password: string }) => {
      try {
        const {
          data: { accessToken: userAccessToken },
        } = await api.auth.loginUser(props);

        await startSessionWithUserAccessToken(userAccessToken, claimInvitation);
      } catch (err) {
        onError(err);
        throw err;
      }
    },
    [api.auth, startSessionWithUserAccessToken, claimInvitation, onError]
  );

  const onCreateAccount = useCallback(
    async (props: {
      email: string;
      password: string;
      profile: any;
      organizationProfile?: any;
    }) => {
      try {
        const {
          data: { accessToken: userAccessToken },
        } = await api.auth.createUserWithPassword(props);

        let organization: CaliobaseOrganization | null = null;

        if (props.organizationProfile) {
          organization = (
            await api.organization.create(
              {
                profile: props.organizationProfile,
              },
              {
                headers: { ...bearerToken(userAccessToken) },
              }
            )
          ).data;
        }

        await startSessionWithUserAccessToken(
          userAccessToken,
          organization ?? claimInvitation
        );
      } catch (err) {
        onError(err);
        throw err;
      }
    },
    [
      api.auth,
      api.organization,
      startSessionWithUserAccessToken,
      claimInvitation,
      onError,
    ]
  );

  const onForgotPassword = useCallback(
    async (props: { email: string }) => {
      await api.auth.emailResetToken(props);
    },
    [api]
  );

  return {
    invitation,
    setSearchParams,
    showPasswordAuth,
    setShowPasswordAuth,
    setMode,
    mode,
    modeLabel,
    handleSignInSSO,
    startSessionWithUserAccessToken,
    claimInvitation,
    userProfileFields,
    organizationProfileFields,
    root,
    onError,
    onLogin,
    onCreateAccount,
    onForgotPassword,
  };
}

export function Login() {
  const login = useLogin();

  const {
    invitation,
    setSearchParams,
    showPasswordAuth,
    setShowPasswordAuth,
    modeLabel,
    root,
    handleSignInSSO,
  } = login;

  return (
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
        {showPasswordAuth && <PasswordLoginFormFragment {...login} />}

        {root?.socialProviders.map((provider) => (
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
  );
}

function PasswordLoginFormFragment(props: ReturnType<typeof useLogin>) {
  const {
    mode,
    modeLabel,
    setMode,
    onLogin,
    onForgotPassword,
    onCreateAccount,
    userProfileFields,
    organizationProfileFields,
    claimInvitation,
    root,
  } = props;

  const { allowCreateOwnOrganizations } = root ?? {};

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [userProfile, setUserProfile] = useState(() =>
    createInstanceFromFields(userProfileFields)
  );

  const [organizationProfile, setOrganizationProfile] = useState(() =>
    claimInvitation == null
      ? createInstanceFromFields(organizationProfileFields)
      : null
  );

  return (
    <>
      <h2 className="text-center text-lg font-bold text-gray-600">
        {modeLabel}
      </h2>
      {mode === 'create' && (
        <>
          <Fieldset
            fields={userProfileFields}
            item={userProfile}
            onChange={setUserProfile}
          />
          {organizationProfile && (
            <Fieldset
              fields={organizationProfileFields}
              item={organizationProfile}
              onChange={setOrganizationProfile}
            />
          )}
        </>
      )}
      <TextInput
        label="Email"
        type="email"
        autoComplete="email"
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
            onClick={() => onLogin({ email, password })}
          >
            Log In
          </PendingButton>
          <button
            className="rounded px-2 py-1 text-indigo-600"
            onClick={() => onForgotPassword({ email })}
          >
            Forgot Password
          </button>
          {(allowCreateOwnOrganizations || claimInvitation) && (
            <button
              className="rounded px-2 py-1 text-gray-600"
              onClick={() => setMode('create')}
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
            onClick={() =>
              onCreateAccount({
                email,
                password,
                profile: userProfile,
                organizationProfile,
              })
            }
          >
            Create Account
          </PendingButton>
          <button
            className="rounded px-2 py-1 text-gray-600"
            onClick={() => setMode('login')}
          >
            Log with an account
          </button>
        </>
      )}
    </>
  );
}
