import { useMemo, useState } from 'react';
import { Fieldset } from '../components/Fieldset';
import { TextInput } from '../components/TextInput';
import { useApiContext } from '../context/ApiContext';
import { useUserContext } from '../context/UserContext';
import { createInstanceFromFields } from '../lib';
import { bearerToken } from '../lib/bearerToken';

export function CreateRoot() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { api, caliobaseUiConfiguration, reloadRoot } = useApiContext();
  const { setAccessToken } = useUserContext();

  const userProfileFields = useMemo(() => {
    const fields = caliobaseUiConfiguration.getBuiltInFields('userProfile');
    return fields;
  }, [caliobaseUiConfiguration]);

  const [userProfile, setUserProfile] = useState(() =>
    createInstanceFromFields(userProfileFields)
  );

  const organizationProfileFields = useMemo(() => {
    const fields = caliobaseUiConfiguration.getBuiltInFields(
      'organizationProfile'
    );
    return fields;
  }, [caliobaseUiConfiguration]);

  const [organizationProfile, setOrganizationProfile] = useState(() =>
    createInstanceFromFields(organizationProfileFields)
  );

  async function onCreateRoot() {
    const {
      data: { organizationId },
    } = await api.root.createRoot({
      organization: { profile: organizationProfile },
      user: {
        email,
        password,
        profile: userProfile,
      },
    });

    const {
      data: { accessToken },
    } = await api.auth.loginUser({ email, password });

    const {
      data: { accessToken: orgAccessToken },
    } = await api.organization.getOrganizationToken(organizationId, {
      headers: { ...bearerToken(accessToken) },
    });

    setAccessToken(orgAccessToken);
    reloadRoot();
  }

  return (
    <div className="flex h-screen bg-gray-200">
      <div className="m-auto grid w-[480px] gap-3 rounded bg-white p-2">
        <h2 className="text-center text-lg font-bold text-gray-600">
          Initial Setup
        </h2>
        <Fieldset
          fields={organizationProfileFields}
          item={organizationProfile}
          onChange={setOrganizationProfile}
        />
        <Fieldset
          fields={userProfileFields}
          item={userProfile}
          onChange={setUserProfile}
        />
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
        <button
          className="rounded bg-indigo-700 p-3 font-bold text-white"
          onClick={onCreateRoot}
        >
          Create
        </button>
      </div>
    </div>
  );
}
