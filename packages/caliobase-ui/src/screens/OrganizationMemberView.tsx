import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { invariant } from 'circumspect';
import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsyncEffectState } from 'use-async-effect-state';
import { ContentTable } from '../components/data/ContentTable';
import { ItemView } from '../components/data/ItemView';
import { RoleDetailEditor } from '../components/data/RoleDetailEditor';
import { ModalDialog } from '../components/ModalDialog';
import { useApiContext } from '../context';
import { useUserContext } from '../context/UserContext';
import { rolesField } from '../lib/commonFields';
import { CaliobaseMember, CaliobaseMemberInvitationToken } from '../lib/types';
import { FocusView } from '../patterns/FocusView';

export function OrganizationMemberListView() {
  const navigate = useNavigate();
  const { userOrgApi } = useUserContext();
  const memberFields =
    useApiContext().caliobaseUiConfiguration.getBuiltInFields(
      'organization-member'
    );

  const [items] = useAsyncEffectState(
    undefined,
    async (signal) => {
      return (
        await userOrgApi?.organization.listMembers({
          signal,
        })
      )?.data.map((member) => ({
        id: `${member.organizationId}:${member.userId}`,
        ...member,
      }));
    },
    [userOrgApi]
  );

  const [showCreateInvitationDialog, setShowCreateInvitationDialog] =
    useState(false);

  const handleCreateInvitation = useCallback(async () => {
    setShowCreateInvitationDialog(true);
  }, []);

  return (
    <>
      {showCreateInvitationDialog && (
        <ModalDialog open={true} setOpen={setShowCreateInvitationDialog}>
          <div className="max-w-screen w-[500px]">
            <InviteUserView />
          </div>
        </ModalDialog>
      )}
      <FocusView
        preTitle="User Management"
        title="Users"
        buttons={[
          <button onClick={handleCreateInvitation}>Create Invitation</button>,
        ]}
      >
        <div className="rounded bg-gray-50 p-3 shadow-lg">
          {items && (
            <ContentTable
              items={items}
              fields={memberFields}
              onEditItem={(item) => navigate(`./${item.id}`)}
            />
          )}
        </div>
      </FocusView>
    </>
  );
}

export function OrganizationMemberDetailView() {
  const navigate = useNavigate();
  const { userOrgApi } = useUserContext();
  const { orgUserId } = useParams();
  const memberFields =
    useApiContext().caliobaseUiConfiguration.getBuiltInFields(
      'organization-member'
    );

  invariant(orgUserId);

  const [orgId, userId] = orgUserId.split(':');

  const [item, setItem] = useAsyncEffectState(
    undefined,
    async (signal) => {
      if (userOrgApi == null) {
        return undefined;
      }

      const { data: member } = await userOrgApi.organization.getMember(userId, {
        signal,
      });

      invariant(member);

      return { id: `${member?.organizationId}_${member?.userId}`, ...member };
    },
    [userOrgApi]
  );

  const navigateToList = useCallback(() => {
    navigate('./..');
  }, [navigate]);

  const onSave = useCallback(
    async (item: CaliobaseMember & { id: string }) => {
      await userOrgApi?.organization.updateMember(item.userId, {
        roles: item.roles,
      });
      navigateToList();
    },
    [navigateToList, userOrgApi?.organization]
  );

  return (
    <FocusView
      onGoBack={navigateToList}
      preTitle="User Management"
      title="Users"
      buttons={[<button onClick={() => item && onSave(item)}>Save</button>]}
    >
      {item && (
        <ItemView
          key={item.id}
          itemState={item}
          onItemChange={setItem}
          fields={memberFields}
        />
      )}
    </FocusView>
  );
}

function InviteUserView() {
  const { userOrgApi } = useUserContext();

  const [roles, setRoles] = useState<string[]>([]);

  const [invitations, setInvitations] = useState<
    CaliobaseMemberInvitationToken[]
  >([]);

  const handleCreateInvitation = useCallback(async () => {
    invariant(userOrgApi);
    const { data: invitation } = await userOrgApi.organization.createInvitation(
      {
        roles,
      }
    );
    setInvitations((invitations) => [...invitations, invitation]);
  }, [roles, userOrgApi]);

  return (
    <div className="grid gap-3">
      <h3 className="text-xl font-bold">Create one-time-use invitation link</h3>
      <h4>Grant the user these roles:</h4>
      <RoleDetailEditor
        item={{}}
        value={roles}
        onChange={setRoles}
        field={rolesField}
      />
      <button
        className={clsx(
          `rounded border px-4 py-2 text-sm font-bold`,
          'border-indigo-600 bg-indigo-600 text-white'
        )}
        onClick={handleCreateInvitation}
      >
        Create Invitation Link
      </button>
      <div>
        {invitations.map((invitation) => (
          <div key={invitation.token}>
            <CopyValueButton value={getInvitationLink(invitation)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function getInvitationLink(invitation: CaliobaseMemberInvitationToken) {
  return new URL(
    `/invitation?token=${invitation.token}`,
    window.location.href
  ).toString();
}

function CopyValueButton(props: { value: string }) {
  const [didCopy, setDidCopy] = useState(false);

  const timeoutRef = useRef(0);

  const copyValueToClipboard = useCallback(() => {
    navigator.clipboard.writeText(props.value);
    setDidCopy(true);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setDidCopy(false), 1250);
  }, [props.value]);

  return (
    <div className="grid">
      <button
        className={clsx(
          'group flex items-center rounded  border text-xs',
          didCopy ? 'bg-green-50' : 'hover:bg-indigo-50 hover:underline'
        )}
        onClick={copyValueToClipboard}
      >
        <span className="grid flex-1 p-2">
          <span className="w-full overflow-hidden overflow-ellipsis whitespace-nowrap">
            {didCopy ? 'Copied' : props.value}
          </span>
        </span>
        <div
          className={clsx(
            'p-2',
            didCopy
              ? 'bg-green-500'
              : 'group-hover:bg-indigo-600 group-hover:text-white'
          )}
        >
          <FontAwesomeIcon
            className="h-4 w-4"
            icon={didCopy ? faCheck : faCopy}
          />
        </div>
      </button>
    </div>
  );
}
