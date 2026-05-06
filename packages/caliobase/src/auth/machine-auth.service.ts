import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, createHash } from 'crypto';
import { Repository } from 'typeorm';
import { AllRoles, Role } from '../entity-module/roles';
import { MachineAccessToken } from './entities/machine-access-token.entity';
import { Member } from './entities/member.entity';
import { User } from './entities/user.entity';
import { JwtSignerService } from './jwt-signer.service';
import { CaliobaseRequestUser } from './jwt.strategy';
import {
  createMachineOidcIdentitySummary,
  MachineOidcIssuer,
  MachineOidcIssuersToken,
  MachineOidcVerifier,
} from './machine-oidc';

const MACHINE_TOKEN_PREFIX = 'cbm_';
const DEFAULT_JWT_EXPIRES_IN_SECONDS = 60 * 60;
const DEFAULT_MACHINE_USER_EMAIL_DOMAIN = 'caliobase.local';

export type MachineTokenSummary = Pick<
  MachineAccessToken,
  | 'id'
  | 'name'
  | 'tokenPrefix'
  | 'organizationId'
  | 'userId'
  | 'roles'
  | 'createdByUserId'
  | 'createdAt'
  | 'updatedAt'
  | 'revokedAt'
  | 'lastUsedAt'
>;

@Injectable()
export class MachineAuthService {
  constructor(
    @InjectRepository(MachineAccessToken)
    private readonly machineTokenRepo: Repository<MachineAccessToken>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    private readonly jwtSignerService: JwtSignerService,
    @Optional()
    @Inject(MachineOidcIssuersToken)
    private readonly oidcIssuers: MachineOidcIssuer[] = []
  ) {
    this.oidcVerifier = new MachineOidcVerifier(this.oidcIssuers);
  }

  private readonly oidcVerifier: MachineOidcVerifier;

  async createMachineToken(
    requestUser: CaliobaseRequestUser,
    input: { name: string; roles?: Role[] }
  ) {
    if (!requestUser.user || !requestUser.organization || !requestUser.member) {
      throw new UnauthorizedException('organization member token required');
    }

    const roles = input.roles ?? ['guest'];
    this.validateRoles(roles);

    const token = generateMachineToken();
    const machineUser = await this.userRepo.save(
      this.userRepo.create({
        email: machineUserEmail(input.name),
        emailVerified: true,
      })
    );

    await this.memberRepo.save(
      this.memberRepo.create({
        userId: machineUser.id,
        organizationId: requestUser.organization.id,
        roles,
      })
    );

    const machineToken = await this.machineTokenRepo.save(
      this.machineTokenRepo.create({
        name: input.name,
        tokenHash: hashMachineToken(token),
        tokenPrefix: token.slice(0, 12),
        organizationId: requestUser.organization.id,
        userId: machineUser.id,
        roles,
        createdByUserId: requestUser.user.id,
      })
    );

    return {
      token,
      machineUser: sanitizeMachineToken(machineToken),
    };
  }

  async listMachineTokens(
    requestUser: CaliobaseRequestUser
  ): Promise<MachineTokenSummary[]> {
    if (!requestUser.organization) {
      throw new UnauthorizedException('organization token required');
    }

    const tokens = await this.machineTokenRepo.find({
      where: { organizationId: requestUser.organization.id },
      order: { createdAt: 'DESC' },
    });

    return tokens.map(sanitizeMachineToken);
  }

  async revokeMachineToken(requestUser: CaliobaseRequestUser, id: string) {
    if (!requestUser.organization) {
      throw new UnauthorizedException('organization token required');
    }

    const token = await this.machineTokenRepo.findOne({
      where: { id, organizationId: requestUser.organization.id },
    });

    if (!token) {
      throw new BadRequestException('machine token not found');
    }

    token.revokedAt = new Date();
    await this.machineTokenRepo.save(token);
    return sanitizeMachineToken(token);
  }

  async exchangeMachineToken(token: string) {
    const machineToken = await this.machineTokenRepo.findOne({
      where: { tokenHash: hashMachineToken(token) },
    });

    if (!machineToken || machineToken.revokedAt) {
      throw new UnauthorizedException('invalid machine token');
    }

    machineToken.lastUsedAt = new Date();
    await this.machineTokenRepo.save(machineToken);

    return {
      accessToken: await this.jwtSignerService.sign(
        {
          userId: machineToken.userId,
          organizationId: machineToken.organizationId,
        },
        { expiresIn: DEFAULT_JWT_EXPIRES_IN_SECONDS }
      ),
      tokenType: 'Bearer' as const,
      expiresIn: DEFAULT_JWT_EXPIRES_IN_SECONDS,
      machineUser: sanitizeMachineToken(machineToken),
    };
  }

  async exchangeOidcToken(token: string) {
    if (this.oidcIssuers.length === 0) {
      throw new UnauthorizedException('OIDC machine auth is not configured');
    }

    try {
      const { issuer, subject, binding } = await this.oidcVerifier.verify(
        token
      );
      const machineIdentity = createMachineOidcIdentitySummary({
        issuer,
        subject,
        binding,
      });

      return {
        accessToken: await this.jwtSignerService.sign(
          {
            userId: binding.userId,
            organizationId: binding.organizationId,
          },
          { expiresIn: DEFAULT_JWT_EXPIRES_IN_SECONDS }
        ),
        tokenType: 'Bearer' as const,
        expiresIn: DEFAULT_JWT_EXPIRES_IN_SECONDS,
        machineIdentity,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'invalid OIDC machine token'
      );
    }
  }

  private validateRoles(roles: Role[]) {
    if (roles.length === 0) {
      throw new BadRequestException('at least one role is required');
    }

    const invalidRole = roles.find((role) => !AllRoles.includes(role));
    if (invalidRole) {
      throw new BadRequestException(`invalid role '${invalidRole}'`);
    }
  }
}

export function extractMachineToken(input: { authorization?: string }) {
  const bearerMatch = input.authorization?.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1] ?? null;
}

export function hashMachineToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function generateMachineToken() {
  return `${MACHINE_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

function machineUserEmail(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `machine+${slug || 'service'}-${randomBytes(6).toString(
    'hex'
  )}@${DEFAULT_MACHINE_USER_EMAIL_DOMAIN}`;
}

function sanitizeMachineToken(token: MachineAccessToken): MachineTokenSummary {
  return {
    id: token.id,
    name: token.name,
    tokenPrefix: token.tokenPrefix,
    organizationId: token.organizationId,
    userId: token.userId,
    roles: token.roles,
    createdByUserId: token.createdByUserId,
    createdAt: token.createdAt,
    updatedAt: token.updatedAt,
    revokedAt: token.revokedAt,
    lastUsedAt: token.lastUsedAt,
  };
}
