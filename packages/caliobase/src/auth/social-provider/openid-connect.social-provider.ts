import { BaseClient, Issuer } from 'openid-client';
import { SocialProvider } from '..';
import { assert } from '../../lib/assert';
import { SocialProfile, SocialValidation } from './social-provider';

export type OpenIdConnectSocialProviderOptions = {
  key: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export class OpenIdConnectSocialProvider implements SocialProvider {
  name: string;
  client: Promise<BaseClient>;

  constructor(options: OpenIdConnectSocialProviderOptions) {
    this.name = `openidconnect:${options.key}`;
    this.client = (async () => {
      const issuer = await Issuer.discover(options.issuer);
      const client = new issuer.Client({
        client_id: options.clientId,
        client_secret: options.clientSecret,
        redirect_uris: [options.redirectUri],
      });
      return client;
    })();
  }

  async validate(request: SocialValidation): Promise<SocialProfile> {
    const client = await this.client;
    const userInfo = await client.userinfo(request.accessToken);
    assert(userInfo.email);
    return {
      provider: this.name,
      providerUserId: userInfo.sub,
      accessToken: request.accessToken,
      email: userInfo.email,
      emailVerified: userInfo.email_verified,
      name: {
        givenName: userInfo.given_name,
        familyName: userInfo.family_name,
      },
    };
  }
}
