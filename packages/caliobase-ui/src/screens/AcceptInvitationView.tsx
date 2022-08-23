import { invariant } from 'circumspect';
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAsyncEffectState } from 'use-async-effect-state';
import { useUserContext } from '../context/UserContext';
import { CaliobaseMemberInvitationToken } from '../lib/types';

export function AcceptInvitationView() {
  const navigate = useNavigate();

  const token = useSearchParams()[0].get('token');

  const { userOrgApi, setAccessToken } = useUserContext();

  const [invitation] = useAsyncEffectState(
    undefined,
    async (signal) => {
      return (
        (token &&
          (await userOrgApi?.organization.getInvitation(token, { signal }))
            ?.data) ||
        null
      );
    },
    [userOrgApi, token]
  );

  const handleAcceptInvitation = useCallback(async () => {
    invariant(token);
    invariant(userOrgApi);

    const invitation = (await userOrgApi.organization.claimInvitation(token))
      .data;

    if (invitation) {
      const {
        data: { accessToken: userOrgToken },
      } = await userOrgApi.organization.getOrganizationToken(
        invitation.organization.id
      );

      setAccessToken(userOrgToken);
      navigate('/');
    }
  }, [navigate, setAccessToken, token, userOrgApi]);

  return (
    <div className="flex h-screen bg-gray-200">
      {invitation && (
        <div className="m-auto grid gap-3 rounded bg-white p-2">
          <DescribeInvitation invitation={invitation} />
          <button
            className="rounded bg-indigo-700 p-3 font-bold text-white"
            onClick={handleAcceptInvitation}
          >
            Accept this invitation
          </button>
        </div>
      )}
      {invitation === null && (
        <div className="m-auto grid gap-3 rounded bg-white p-2">
          <h3 className="font-bold">Invalid Token</h3>
          <p>This invitation is either expired or has already been claimed</p>
        </div>
      )}
    </div>
  );
}

export function DescribeInvitation({
  invitation,
}: {
  invitation: CaliobaseMemberInvitationToken;
}) {
  return (
    <div>
      <h4 className="font-xl">
        You have been invited to join:{' '}
        <span className="font-bold">
          {invitation.organization.profile['name'] as string}
        </span>
      </h4>
      <h4>
        In the role(s) of: <span className="font-bold">{invitation.roles}</span>
      </h4>
    </div>
  );
}
