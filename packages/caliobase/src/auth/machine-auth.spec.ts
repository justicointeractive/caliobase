import { CaliobaseRequestUser } from './jwt.strategy';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { Issuer } from 'openid-client';
import {
  extractMachineToken,
  hashMachineToken,
  MachineAuthService,
} from './machine-auth.service';
import { MachineOidcVerifier } from './machine-oidc';

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
  afterEach(() => {
    jest.restoreAllMocks();
  });

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
    expect(result.machineAccessToken).toMatchObject({
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
      machineAccessToken: { id: 'mat_123', roles: ['guest'] },
    });
    expect(machineTokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ lastUsedAt: expect.any(Date) })
    );
  });

  it('lists machine tokens scoped to the request organization', async () => {
    const machineTokenRepo = createRepoMock();
    machineTokenRepo.find.mockResolvedValue([
      {
        id: 'mat_123',
        name: 'octavius',
        tokenPrefix: 'cbm_testtok',
        organizationId: 'org_0',
        userId: 'user_machine',
        roles: ['guest'],
        createdByUserId: 'user_owner',
        createdAt: new Date('2026-05-02T00:00:00Z'),
        updatedAt: new Date('2026-05-02T00:00:00Z'),
      },
    ]);
    const service = new MachineAuthService(
      machineTokenRepo as never,
      createRepoMock() as never,
      createRepoMock() as never,
      { sign: jest.fn() } as never
    );

    await expect(service.listMachineTokens(requestUser)).resolves.toEqual([
      expect.objectContaining({ id: 'mat_123', roles: ['guest'] }),
    ]);
    expect(machineTokenRepo.find).toHaveBeenCalledWith({
      where: { organizationId: 'org_0' },
      order: { createdAt: 'DESC' },
    });
  });

  it('revokes a machine token in the request organization', async () => {
    const token = {
      id: 'mat_123',
      name: 'octavius',
      tokenPrefix: 'cbm_testtok',
      organizationId: 'org_0',
      userId: 'user_machine',
      roles: ['guest'],
      createdByUserId: 'user_owner',
      createdAt: new Date('2026-05-02T00:00:00Z'),
      updatedAt: new Date('2026-05-02T00:00:00Z'),
    };
    const machineTokenRepo = createRepoMock();
    machineTokenRepo.findOne.mockResolvedValue(token);
    const service = new MachineAuthService(
      machineTokenRepo as never,
      createRepoMock() as never,
      createRepoMock() as never,
      { sign: jest.fn() } as never
    );

    const result = await service.revokeMachineToken(requestUser, 'mat_123');

    expect(machineTokenRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'mat_123', organizationId: 'org_0' },
    });
    expect(machineTokenRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ revokedAt: expect.any(Date) })
    );
    expect(result).toMatchObject({ id: 'mat_123', revokedAt: expect.any(Date) });
  });

  it('rejects revoked machine tokens', async () => {
    const machineTokenRepo = createRepoMock();
    machineTokenRepo.findOne.mockResolvedValue({
      id: 'mat_123',
      tokenHash: hashMachineToken('cbm_testtoken'),
      revokedAt: new Date('2026-05-02T00:00:00Z'),
    });
    const jwtSignerService = { sign: jest.fn(async () => 'signed-jwt') };
    const service = new MachineAuthService(
      machineTokenRepo as never,
      createRepoMock() as never,
      createRepoMock() as never,
      jwtSignerService as never
    );

    await expect(service.exchangeMachineToken('cbm_testtoken')).rejects.toThrow(
      'invalid machine token'
    );
    expect(jwtSignerService.sign).not.toHaveBeenCalled();
    expect(machineTokenRepo.save).not.toHaveBeenCalled();
  });

  it('exchanges a trusted OIDC machine JWT for a short-lived Caliobase JWT', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const publicJwk = await exportJWK(publicKey);
    publicJwk.kid = 'test-key';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';

    const oidcToken = await new SignJWT({
      sub: 'repo:justicointeractive/nats2015s:environment:staging',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://oidc.example.test')
      .setAudience('caliobase-machine-auth')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    const jwtSignerService = { sign: jest.fn(async () => 'signed-jwt') };
    const service = new MachineAuthService(
      createRepoMock() as never,
      createRepoMock() as never,
      createRepoMock() as never,
      jwtSignerService as never,
      [
        {
          issuer: 'https://oidc.example.test',
          audience: 'caliobase-machine-auth',
          jwks: { keys: [publicJwk] },
          subjects: [
            {
              subject: 'repo:justicointeractive/nats2015s:environment:staging',
              userId: 'user_machine',
              organizationId: 'org_0',
              name: 'nats2015s staging',
            },
          ],
        },
      ]
    );

    const result = await service.exchangeOidcToken(oidcToken);

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
      machineIdentity: {
        id: 'oidc:https://oidc.example.test:repo:justicointeractive/nats2015s:environment:staging',
        name: 'nats2015s staging',
        issuer: 'https://oidc.example.test',
        subject: 'repo:justicointeractive/nats2015s:environment:staging',
        audience: 'caliobase-machine-auth',
        organizationId: 'org_0',
        userId: 'user_machine',
      },
    });
  });

  it('returns a generic error for invalid OIDC machine JWTs', async () => {
    const service = new MachineAuthService(
      createRepoMock() as never,
      createRepoMock() as never,
      createRepoMock() as never,
      { sign: jest.fn() } as never,
      [
        {
          issuer: 'https://oidc.example.test',
          audience: 'caliobase-machine-auth',
          jwks: { keys: [] },
          subjects: [],
        },
      ]
    );

    await expect(service.exchangeOidcToken('not-a-jwt')).rejects.toThrow(
      'invalid OIDC machine token'
    );
  });

  it('does not permanently cache failed OIDC discovery attempts', async () => {
    jest
      .spyOn(Issuer, 'discover')
      .mockRejectedValue(new Error('temporary discovery failure'));
    const tokenWithIssuer =
      'e30.eyJpc3MiOiJodHRwczovL29pZGMuZXhhbXBsZS50ZXN0In0.signature';
    const verifier = new MachineOidcVerifier([
      {
        issuer: 'https://oidc.example.test',
        audience: 'caliobase-machine-auth',
        subjects: [],
      },
    ]);

    await expect(verifier.verify(tokenWithIssuer)).rejects.toThrow(
      'temporary discovery failure'
    );
    await expect(verifier.verify(tokenWithIssuer)).rejects.toThrow(
      'temporary discovery failure'
    );
    expect(Issuer.discover).toHaveBeenCalledTimes(2);
  });
});
