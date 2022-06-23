import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
  StrategyOptions as JwtStrategyOptions,
} from 'passport-jwt';

import { CaliobaseJwtPayload } from './jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const publicKeyBase64 = config.get<string>('JWT_PUBLIC_KEY');
    if (publicKeyBase64 == null) {
      throw new Error('missing public key');
    }
    const publicKey = Buffer.from(publicKeyBase64, 'base64').toString('utf8');
    const jwtStrategyOptions: JwtStrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: publicKey,
    };
    super(jwtStrategyOptions);
  }

  async validate({
    userId,
    organizationId,
  }: CaliobaseJwtPayload): Promise<CaliobaseJwtPayload> {
    return { userId, organizationId };
  }
}
