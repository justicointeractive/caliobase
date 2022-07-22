import { BaseClient, generators, Issuer } from 'openid-client';
import { SocialProvider } from '..';
import { assert } from '../../lib/assert';
import {
  MapSocialUserToOrganizationMember,
  SocialValidation,
} from './social-provider';

export type OpenIdConnectSocialProviderOptions<
  TProviderTokenClaims extends Record<string, unknown> = Record<string, unknown>
> = {
  key: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  additionalScopes?: string[];
  mapToMembership?: MapSocialUserToOrganizationMember<TProviderTokenClaims>;
};

export class OpenIdConnectSocialProvider<
  TProviderTokenClaims extends Record<string, unknown> = Record<string, unknown>
> implements SocialProvider<TProviderTokenClaims>
{
  name: string;
  client?: BaseClient;

  constructor(
    private options: OpenIdConnectSocialProviderOptions<TProviderTokenClaims>
  ) {
    this.name = `openidconnect:${options.key}`;
  }

  async init() {
    const { options } = this;
    const issuer = await Issuer.discover(options.issuer);
    this.client = new issuer.Client({
      client_id: options.clientId,
      client_secret: options.clientSecret,
      redirect_uris: [options.redirectUri],
    });
  }

  async createAuthorizationUrl() {
    const { client } = this;
    assert(client);

    const nonce = generators.nonce();
    const authUrl = client.authorizationUrl({
      response_type: 'id_token',
      redirect_uri: this.options.redirectUri,
      scope: [
        ...['openid', 'email', 'profile'],
        ...(this.options.additionalScopes ?? []),
      ].join(' '),
      nonce,
      response_mode: 'fragment', // TODO: use form data method
    });

    return { nonce, authUrl };
  }

  async validate(request: SocialValidation) {
    const { client } = this;
    assert(client);

    const tokenSet = await client.callback(
      this.options.redirectUri,
      {
        access_token: request.accessToken,
        id_token: request.idToken,
      },
      { nonce: request.nonce }
    );

    const userInfo = tokenSet.claims();
    assert(userInfo.email);

    return {
      profile: {
        provider: this.name,
        providerUserId: userInfo.sub,
        accessToken: request.accessToken,
        email: userInfo.email,
        emailVerified: userInfo.email_verified,
        name: {
          givenName: userInfo.given_name,
          familyName: userInfo.family_name,
        },
      },
      providerTokenClaims: userInfo as unknown as TProviderTokenClaims,
    };
  }

  mapToMembership = this.options.mapToMembership;
}
