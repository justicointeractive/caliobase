import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MachineTokenListView } from './MachineTokenView';

const mockRequest = jest.fn();

jest.mock('../context/UserContext', () => ({
  useUserContext: () => ({
    user: { member: { roles: ['owner'] } },
    userOrgApi: { request: mockRequest },
  }),
}));

jest.mock('../context/ApiContext', () => ({
  useApiContext: () => ({
    root: { allRoles: ['owner', 'manager', 'writer', 'moderator', 'guest'] },
  }),
}));

jest.mock('../components/ModalDialog', () => ({
  ModalDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('MachineTokenListView', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({ data: [] });
  });

  it('lists machine tokens for the current organization', async () => {
    mockRequest.mockResolvedValueOnce({
      data: [
        {
          id: 'mat_1',
          name: 'Octavius read access',
          tokenPrefix: 'cbm_abc123',
          organizationId: 'org_1',
          userId: 'user_machine',
          roles: ['guest'],
          createdByUserId: 'user_owner',
          createdAt: '2026-05-20T10:00:00.000Z',
          updatedAt: '2026-05-20T10:00:00.000Z',
          revokedAt: null,
          lastUsedAt: null,
        },
      ],
    });

    render(<MachineTokenListView />);

    expect(await screen.findByText('Octavius read access')).toBeTruthy();
    expect(screen.getByText('cbm_abc123')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/machine-auth/tokens',
        method: 'GET',
        secure: true,
      })
    );
  });

  it('creates a machine token and shows the one-time secret', async () => {
    mockRequest.mockImplementation(({ method }) => {
      if (method === 'POST') {
        return Promise.resolve({
          data: {
            token: 'cbm_secret_once',
            machineAccessToken: {
              id: 'mat_2',
              name: 'Build bot',
              tokenPrefix: 'cbm_secret',
              organizationId: 'org_1',
              userId: 'user_machine',
              roles: ['guest'],
              createdByUserId: 'user_owner',
              createdAt: '2026-05-20T10:00:00.000Z',
              updatedAt: '2026-05-20T10:00:00.000Z',
              revokedAt: null,
              lastUsedAt: null,
            },
          },
        });
      }

      return Promise.resolve({ data: [] });
    });

    render(<MachineTokenListView />);

    fireEvent.click(await screen.findByText('Create Machine Token'));
    fireEvent.change(screen.getByLabelText('Token name'), {
      target: { value: 'Build bot' },
    });
    fireEvent.click(screen.getByText('Create Token'));

    expect(await screen.findByText('cbm_secret_once')).toBeTruthy();
    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/machine-auth/tokens',
          method: 'POST',
          body: { name: 'Build bot', roles: ['guest'] },
          secure: true,
        })
      )
    );
  });
});
