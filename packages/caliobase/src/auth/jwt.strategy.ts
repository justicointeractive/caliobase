import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ApiProperty } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ExtractJwt,
  JwtFromRequestFunction,
  Strategy,
  StrategyOptions as JwtStrategyOptions,
} from 'passport-jwt';
import { Repository } from 'typeorm';
import { Member, Organization, User } from './entities';
import { CaliobaseJwtPayload } from './jwt-payload';

export class CaliobaseRequestUser {
  @ApiProperty({ type: () => User })
  user!: User | null;

  @ApiProperty({ type: () => Organization })
  organization!: Organization | null;

  @ApiProperty({ type: () => Member })
  member!: Member | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends CaliobaseRequestUser {}
  }
}

const fromUrlQueryParameterAndRemove =
  (key: string): JwtFromRequestFunction =>
  (req) => {
    const authToken = req.query[key];
    if (!authToken) {
      return null;
    }
    delete req.query[key];
    return String(authToken);
  };
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Member) private memberRepo: Repository<Member>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    config: ConfigService
  ) {
    const publicKeyBase64 = config.get<string>('JWT_PUBLIC_KEY');
    if (publicKeyBase64 == null) {
      throw new Error('missing public key');
    }
    const publicKey = publicKeyBase64.startsWith('-----BEGIN')
      ? publicKeyBase64
      : Buffer.from(publicKeyBase64, 'base64').toString('utf8');
    const jwtStrategyOptions: JwtStrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        fromUrlQueryParameterAndRemove('authToken'),
      ]),
      secretOrKey: publicKey,
    };
    super(jwtStrategyOptions);
  }

  async validate({
    userId,
    organizationId,
  }: CaliobaseJwtPayload): Promise<CaliobaseRequestUser> {
    // member of organization
    if (userId && organizationId) {
      const member = await this.memberRepo.findOneOrFail({
        where: { userId, organizationId },
        relations: ['user', 'organization'],
      });
      return { user: member.user, organization: member.organization, member };
    }
    // authed user but no organization context
    if (userId) {
      const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
      return {
        user,
        member: null,
        organization: null,
      };
    }
    // anonymous access to organization
    if (organizationId) {
      const organization = await this.orgRepo.findOneOrFail({
        where: { id: organizationId },
      });
      return {
        user: null,
        member: null,
        organization: organization,
      };
    }
    // unauthed user in no org context
    return {
      user: null,
      member: null,
      organization: null,
    };
  }
}
