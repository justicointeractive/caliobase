import { CaliobaseRequestUser } from './jwt.strategy';
import {
  extractMachineToken,
  hashMachineToken,
  MachineAuthService,
} from './machine-auth.service';

const organization = { id: 'org_0' };
const owner = { id: 'user_owner' };
const requestUser = {
  user: owner,
  organization,
  member: { roles: ['owner'] },
} as unknown as CaliobaseRequestUser;

type RepoMock = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
};

function createRepoMock(): RepoMock {
  return {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
  };
}

describe('machine auth', () => {
  it('extracts machine tokens from bearer auth', () => {
    expect(extractMachineToken({ authorization: 'Bearer cbm_auth' })).toBe(
      'cbm_auth'
    );
    expect(extractMachineToken({})).toBeNull();
  });

  it('hashes opaque machine tokens deterministically', () => {
    expect(hashMachineToken('cbm_secret')).toBe(hashMachineToken('cbm_secret'));
    expect(hashMachineToken('cbm_secret')).not.toBe('cbm_secret');
  });

  it('creates a machine user and stores only the token hash', async () => {
    const machineTokenRepo = createRepoMock();
    machineTokenRepo.save.mockImplementation(async (value) => ({
      id: 'mat_123',
      createdAt: new Date('2026-05-02T00:00:00Z'),
      updatedAt: new Date('2026-05-02T00:00:00Z'),
      ...value,
    }));

    const userRepo = createRepoMock();
    userRepo.save.mockImplementation(async (value) => ({
      id: 'user_machine',
      ...value,
    }));

    const memberRepo = createRepoMock();
    const jwtSignerService = { sign: jest.fn() };
    const service = new MachineAuthService(
      machineTokenRepo as never,
      userRepo as never,
      memberRepo as never,
      jwtSignerService as never
    );

    const result = await service.createMachineToken(requestUser, {
      name: 'octavius',
      roles: ['guest'],
    });

    expect(result.token).toMatch(/^cbm_/);
    expect(result.machineUser).toMatchObject({
      name: 'octavius',
      organizationId: 'org_0',
      userId: 'user_machine',
      roles: ['guest'],
    });
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: expect.stringMatching(
          /^machine\+octavius-[0-9a-f]{12}@caliobase\.local$/
        ),
        emailVerified: true,
      })
    );
    expect(machineTokenRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: hashMachineToken(result.token),
        tokenPrefix: result.token.slice(0, 12),
      })
    );
    expect(machineTokenRepo.create.mock.calls[0][0].tokenHash).not.toBe(
      result.token
    );
  });

  it('exchanges a valid machine token for a short-lived Caliobase JWT', async () => {
    const machineTokenRepo = createRepoMock();
    machineTokenRepo.findOne.mockResolvedValue({
      id: 'mat_123',
      name: 'octavius',
      tokenPrefix: 'cbm_testtok',
      tokenHash: hashMachineToken('cbm_testtoken'),
      organizationId: 'org_0',
      userId: 'user_machine',
      roles: ['guest'],
      createdByUserId: 'user_owner',
      createdAt: new Date('2026-05-02T00:00:00Z'),
      updatedAt: new Date('2026-05-02T00:00:00Z'),
    });
    const jwtSignerService = { sign: jest.fn(async () => 'signed-jwt') };
    const service = new MachineAuthService(
      machineTokenRepo as never,
      createRepoMock() as never,
      createRepoMock() as never,
      jwtSignerService as never
    );

    const result = await service.exchangeMachineToken('cbm_testtoken');

    expect(jwtSignerService.sign).toHaveBeenCalledWith(
      {
        userId: 'user_machine',
        organizationId: 'org_0',
      },
      { expiresIn: 3600 }
    );
    expect(result).toMatchObject({
      accessToken: 'signed-jwt',
      tokenType: 'Bearer',
      expiresIn: 3600,
      machineUser: { id: 'mat_123', roles: ['guest'] },
    });
    expect(machineTokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ lastUsedAt: expect.any(Date) })
    );
  });
});
