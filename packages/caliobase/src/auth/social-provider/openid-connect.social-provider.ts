import { nonNull } from 'circumspect';
import { BaseClient, generators, Issuer } from 'openid-client';
import { SocialProvider } from '..';
import { Role } from '../../entity-module';
import { assert } from '../../lib/assert';
import { SelectivelyPartial } from '../../lib/SelectivelyPartial';
import {
  MapSocialUserToOrganizationMember,
  SocialValidation,
  ValidationResult,
} from './social-provider';

export type OidcResponseType = 'id_token' | 'token' | 'code';
export type OidcResponseMode = 'form_post' | 'fragment' | 'query';

export type OpenIdConnectSocialProviderOptions<
  TProviderTokenClaims extends Record<string, unknown> = Record<string, unknown>
> = {
  key: string;
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  responseType: OidcResponseType[];
  responseMode: OidcResponseMode;
  additionalScopes?: string[];
  mapToMembership?:
    | MapSocialUserToOrganizationMember<TProviderTokenClaims>
    | SimpleRoleMap;
};

export type OpenIdConnectSocialProviderOptionsInput<
  TProviderTokenClaims extends Record<string, unknown> = Record<string, unknown>
> = SelectivelyPartial<
  OpenIdConnectSocialProviderOptions<TProviderTokenClaims>,
  'responseType' | 'responseMode'
>;

export class OpenIdConnectSocialProvider<
  TProviderTokenClaims extends Record<string, unknown> = Record<string, unknown>
> implements SocialProvider<TProviderTokenClaims>
{
  name: string;
  client?: BaseClient;
  options: OpenIdConnectSocialProviderOptions<TProviderTokenClaims>;
  mapToMembership:
    | MapSocialUserToOrganizationMember<TProviderTokenClaims>
    | undefined;

  constructor(
    options: OpenIdConnectSocialProviderOptionsInput<TProviderTokenClaims>
  ) {
    this.name = `openidconnect:${options.key}`;
    this.options = {
      ...options,
      responseType: options.responseType ?? ['id_token'],
      responseMode: options.responseMode ?? 'form_post',
    };
    this.mapToMembership =
      this.options.mapToMembership &&
      (typeof this.options.mapToMembership === 'function'
        ? this.options.mapToMembership
        : mapProviderRoles(this.options.mapToMembership));
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
      response_type: this.options.responseType.join(' '),
      response_mode: this.options.responseMode,
      redirect_uri: this.options.redirectUri,
      scope: [
        ...['openid', 'email', 'profile'],
        ...(this.options.additionalScopes ?? []),
      ].join(' '),
      nonce,
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

    const userInfo = this.options.responseType.includes('id_token')
      ? tokenSet.claims()
      : await client.userinfo(tokenSet);

    assert(userInfo.email);

    return {
      socialProfile: {
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
}

export type SimpleRoleMap = {
  organization: string;
  roles?: Map<string, Role[]>;
  defaultRole?: Role[];
};

export function mapProviderRoles<
  TProviderTokenClaims extends Record<string, unknown>
>(
  roleMap: SimpleRoleMap
): MapSocialUserToOrganizationMember<TProviderTokenClaims> {
  return <T extends TProviderTokenClaims & { roles?: string[] }>({
    providerTokenClaims,
  }: ValidationResult<T>) => {
    const roles = [
      ...new Set(
        (providerTokenClaims.roles ?? [])
          .map((role) => roleMap.roles?.get(role))
          .filter(nonNull)
          .flat()
      ),
    ];

    if (roles.length === 0 && roleMap.defaultRole) {
      roles.push(...roleMap.defaultRole);
    }

    if (roles.length === 0) {
      return null;
    }

    return {
      organizationId: roleMap.organization,
      role: roles,
    };
  };
}
