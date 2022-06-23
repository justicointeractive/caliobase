import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { CaliobaseJwtPayload } from './jwt-payload';
import {
  SocialProvider,
  SocialProvidersToken,
  SocialValidation,
} from './social-provider/social-provider';
@Injectable()
export class AuthService {
  providers: Map<string, SocialProvider>;

  constructor(
    @Inject(SocialProvidersToken) socialProviders: SocialProvider[],
    private jwtService: JwtService,
  ) {
    this.providers = new Map(
      socialProviders.map((provider) => [provider.name, provider]),
    );
  }

  async validate(request: SocialValidation) {
    const socialProvider = this.providers.get(request.provider);

    if (socialProvider == null) {
      throw new Error(
        `no provider registered for social profile type ${request.provider}`,
      );
    }

    const profile = await socialProvider.validate(request);

    return profile;
  }

  async sign(payload: CaliobaseJwtPayload) {
    return await this.jwtService.signAsync(payload);
  }
}
