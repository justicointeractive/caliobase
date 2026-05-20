import {
  faCheck,
  faCopy,
  faRotate,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import clsx from 'clsx';
import { useCallback, useRef, useState } from 'react';
import { useAsyncEffectState } from 'use-async-effect-state';
import { ModalDialog } from '../components/ModalDialog';
import { RoleDetailEditor } from '../components/data/RoleDetailEditor';
import { useUserContext } from '../context/UserContext';
import { rolesField } from '../lib/commonFields';
import { ICaliobaseApi } from '../lib/ICaliobaseApi';
import {
  CaliobaseCreateMachineTokenRequest,
  CaliobaseCreateMachineTokenResponse,
  CaliobaseMachineTokenRole,
  CaliobaseMachineTokenSummary,
} from '../lib/types';
import { FocusView } from '../patterns/FocusView';

type MachineTokenApi = ICaliobaseApi & {
  request?: <T = unknown, E = unknown>(params: {
    path: string;
    method: string;
    body?: unknown;
    secure?: boolean;
    type?: string;
    format?: string;
    signal?: AbortSignal;
  }) => Promise<{ data: T; error?: E }>;
};

export function MachineTokenListView() {
  const { user, userOrgApi } = useUserContext<MachineTokenApi>();
  const [reloadId, setReloadId] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createdToken, setCreatedToken] = useState<{
    token: string;
    summary: CaliobaseMachineTokenSummary;
  } | null>(null);

  const currentUserRoles = getCurrentUserRoles(user);
  const canManageMachineTokens =
    currentUserRoles == null || currentUserRoles.includes('owner');

  const [tokens] = useAsyncEffectState(
    undefined,
    async (signal) => {
      if (userOrgApi == null) {
        return undefined;
      }

      return listMachineTokens(userOrgApi, signal);
    },
    [reloadId, userOrgApi]
  );

  const reload = useCallback(() => {
    setReloadId((id) => id + 1);
  }, []);

  const handleCreate = useCallback(
    async (body: CaliobaseCreateMachineTokenRequest) => {
      const result = await createMachineToken(userOrgApi, body);
      setCreatedToken({
        token: result.token,
        summary: result.machineAccessToken,
      });
      setShowCreateDialog(false);
      reload();
    },
    [reload, userOrgApi]
  );

  const handleRevoke = useCallback(
    async (token: CaliobaseMachineTokenSummary) => {
      if (
        !window.confirm(
          `Revoke machine token "${token.name}"? Existing clients using it will stop working.`
        )
      ) {
        return;
      }

      await revokeMachineToken(userOrgApi, token.id);
      reload();
    },
    [reload, userOrgApi]
  );

  return (
    <>
      {showCreateDialog && (
        <ModalDialog open={true} setOpen={setShowCreateDialog}>
          <CreateMachineTokenDialog
            onCreate={handleCreate}
            onCancel={() => setShowCreateDialog(false)}
          />
        </ModalDialog>
      )}
      {createdToken && (
        <ModalDialog
          open={true}
          setOpen={(open) => {
            if (!open) {
              setCreatedToken(null);
            }
          }}
        >
          <CreatedMachineTokenDialog
            token={createdToken.token}
            summary={createdToken.summary}
            onClose={() => setCreatedToken(null)}
          />
        </ModalDialog>
      )}
      <FocusView
        preTitle="User Management"
        title="Machine Tokens"
        buttons={[
          <button
            type="button"
            className="bg-gray-50 text-gray-700"
            onClick={reload}
          >
            <FontAwesomeIcon icon={faRotate} className="mr-2" />
            Refresh
          </button>,
          canManageMachineTokens ? (
            <button type="button" onClick={() => setShowCreateDialog(true)}>
              Create Machine Token
            </button>
          ) : null,
        ]}
      >
        <p className="max-w-3xl text-sm text-gray-600">
          Machine tokens let services exchange a long-lived secret for a
          short-lived Caliobase access token. The full token is shown once when
          created; only the prefix is stored here afterward.
        </p>
        <div className="overflow-hidden rounded bg-gray-50 shadow-lg">
          <MachineTokenTable tokens={tokens} onRevoke={handleRevoke} />
        </div>
      </FocusView>
    </>
  );
}

function getCurrentUserRoles(user: unknown) {
  const candidate = user as
    | { roles?: string[]; member?: { roles?: string[] } }
    | null
    | undefined;

  return candidate?.roles ?? candidate?.member?.roles;
}

function MachineTokenTable(props: {
  tokens: CaliobaseMachineTokenSummary[] | undefined;
  onRevoke: (token: CaliobaseMachineTokenSummary) => void;
}) {
  if (props.tokens == null) {
    return <div className="p-4 text-sm text-gray-500">Loading tokens…</div>;
  }

  if (props.tokens.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No machine tokens have been created for this organization.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Prefix</th>
            <th className="px-4 py-3">Roles</th>
            <th className="px-4 py-3">Last used</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {props.tokens.map((token) => (
            <tr key={token.id} className="align-top">
              <td className="px-4 py-3">
                <div className="font-bold text-gray-900">{token.name}</div>
                <div className="text-xs text-gray-500">
                  Created {formatDate(token.createdAt)}
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-700">
                {token.tokenPrefix}
              </td>
              <td className="px-4 py-3">
                <RolePills roles={token.roles} />
              </td>
              <td className="px-4 py-3 text-gray-700">
                {token.lastUsedAt ? formatDate(token.lastUsedAt) : 'Never'}
              </td>
              <td className="px-4 py-3">
                {token.revokedAt ? (
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                    Revoked
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                    Active
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {!token.revokedAt && (
                  <button
                    type="button"
                    className="rounded border border-red-200 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                    onClick={() => props.onRevoke(token)}
                  >
                    <FontAwesomeIcon icon={faTrash} className="mr-2" />
                    Revoke
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateMachineTokenDialog({
  onCreate,
  onCancel,
}: {
  onCreate: (body: CaliobaseCreateMachineTokenRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [roles, setRoles] = useState<CaliobaseMachineTokenRole[]>(['guest']);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onCreate({ name: trimmedName, roles });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create token.');
    } finally {
      setIsSaving(false);
    }
  }, [name, onCreate, roles]);

  return (
    <div className="grid max-w-screen-sm gap-4 p-1">
      <div>
        <h3 className="text-xl font-bold">Create machine token</h3>
        <p className="text-sm text-gray-600">
          Pick the least-privileged roles this machine needs. The secret token
          will be shown once after creation.
        </p>
      </div>
      <label className="grid gap-1 text-sm font-bold">
        Token name
        <input
          className="rounded border border-gray-300 px-3 py-2 font-normal"
          value={name}
          placeholder="Octavius read access"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className="grid gap-2">
        <div className="text-sm font-bold">Roles</div>
        <RoleDetailEditor
          item={{}}
          value={roles}
          onChange={(value) => setRoles(value as CaliobaseMachineTokenRole[])}
          field={rolesField}
          isValid
        />
      </div>
      {error && <div className="text-sm font-bold text-red-700">{error}</div>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded border border-gray-300 px-4 py-2 text-sm font-bold"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="rounded border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={isSaving}
          onClick={submit}
        >
          {isSaving ? 'Creating…' : 'Create Token'}
        </button>
      </div>
    </div>
  );
}

function CreatedMachineTokenDialog(props: {
  token: string;
  summary: CaliobaseMachineTokenSummary;
  onClose: () => void;
}) {
  return (
    <div className="grid max-w-screen-sm gap-4 p-1">
      <div>
        <h3 className="text-xl font-bold">Machine token created</h3>
        <p className="text-sm text-gray-600">
          Copy this token now. Caliobase stores only its hash, so it cannot be
          shown again.
        </p>
      </div>
      <div className="rounded border border-yellow-200 bg-yellow-50 p-3">
        <div className="text-sm font-bold text-yellow-800">
          {props.summary.name}
        </div>
        <CopyValueButton value={props.token} />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
          onClick={props.onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function RolePills(props: { roles: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {props.roles.map((role) => (
        <span
          key={role}
          className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700"
        >
          {role}
        </span>
      ))}
    </div>
  );
}

function CopyValueButton(props: { value: string }) {
  const [didCopy, setDidCopy] = useState(false);
  const timeoutRef = useRef(0);

  const copyValueToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(props.value);
    setDidCopy(true);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setDidCopy(false), 1250);
  }, [props.value]);

  return (
    <button
      type="button"
      className={clsx(
        'group mt-2 flex w-full items-center rounded border text-left text-xs',
        didCopy ? 'bg-green-50' : 'bg-white hover:bg-indigo-50 hover:underline'
      )}
      onClick={copyValueToClipboard}
    >
      <span className="grid min-w-0 flex-1 p-2">
        <span className="overflow-hidden overflow-ellipsis whitespace-nowrap font-mono">
          {didCopy ? 'Copied' : props.value}
        </span>
      </span>
      <span
        className={clsx(
          'p-2',
          didCopy
            ? 'bg-green-500 text-white'
            : 'group-hover:bg-indigo-600 group-hover:text-white'
        )}
      >
        <FontAwesomeIcon className="h-4 w-4" icon={didCopy ? faCheck : faCopy} />
      </span>
    </button>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

async function createMachineToken(
  api: MachineTokenApi,
  body: CaliobaseCreateMachineTokenRequest
) {
  if (api.machineAuth?.createToken) {
    return (await api.machineAuth.createToken(body)).data;
  }

  return (
    await requestMachineAuth<CaliobaseCreateMachineTokenResponse>(api, {
      path: '/api/machine-auth/tokens',
      method: 'POST',
      body,
    })
  ).data;
}

async function listMachineTokens(api: MachineTokenApi, signal?: AbortSignal) {
  if (api.machineAuth?.listTokens) {
    return (await api.machineAuth.listTokens({ signal })).data;
  }

  return (
    await requestMachineAuth<CaliobaseMachineTokenSummary[]>(api, {
      path: '/api/machine-auth/tokens',
      method: 'GET',
      signal,
    })
  ).data;
}

async function revokeMachineToken(api: MachineTokenApi, id: string) {
  if (api.machineAuth?.revokeToken) {
    return (await api.machineAuth.revokeToken(id)).data;
  }

  return (
    await requestMachineAuth<CaliobaseMachineTokenSummary>(api, {
      path: `/api/machine-auth/tokens/${id}`,
      method: 'DELETE',
    })
  ).data;
}

function requestMachineAuth<T>(
  api: MachineTokenApi,
  params: {
    path: string;
    method: string;
    body?: unknown;
    signal?: AbortSignal;
  }
) {
  if (!api.request) {
    throw new Error('Machine token API is not available in this client.');
  }

  return api.request<T>({
    ...params,
    secure: true,
    type: params.body == null ? undefined : 'application/json',
    format: 'json',
  });
}
