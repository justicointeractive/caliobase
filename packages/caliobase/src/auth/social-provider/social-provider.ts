import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../entity-module/roles';
import { Awaitable } from '../../lib/awaitable';

export const SocialProvidersToken = Symbol('SOCIAL_PROVIDERS');

export type ValidationResult<
  TProviderTokenClaims extends Record<string, unknown>
> = {
  socialProfile: SocialProfile;
  providerTokenClaims: TProviderTokenClaims;
};

export type MapSocialUserToOrganizationMember<
  TProviderTokenClaims extends Record<string, unknown>
> = (result: ValidationResult<TProviderTokenClaims>) => Awaitable<{
  organizationId: string;
  role: Role[];
} | null>;

export type SocialProvider<
  TProviderTokenClaims extends Record<string, unknown> = Record<string, unknown>
> = {
  name: string;
  validate: (
    request: SocialValidation
  ) => Promise<ValidationResult<TProviderTokenClaims>>;
  createAuthorizationUrl?: () => Promise<{ authUrl: string; nonce: string }>;
  init?: () => Promise<void>;
  mapToMembership?: MapSocialUserToOrganizationMember<TProviderTokenClaims>;
};

export class SocialProfileName {
  @ApiProperty()
  givenName?: string;

  @ApiProperty()
  familyName?: string;
}

export class SocialProfile {
  @ApiProperty()
  provider!: string;

  @ApiProperty()
  providerUserId!: string;

  @ApiPropertyOptional()
  accessToken?: string;

  @ApiProperty()
  name!: SocialProfileName;

  @ApiProperty()
  email?: string;

  @ApiProperty()
  emailVerified?: boolean;
}

export type SocialValidation = SocialRequest & {
  idToken?: string;
  accessToken?: string;
  nonce?: string;
};

export type SocialRequest = {
  provider: string;
};
