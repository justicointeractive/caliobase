import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../entity-module/roles';

export const SocialProvidersToken = Symbol('SOCIAL_PROVIDERS');

type ValidationResult<TProviderExtras extends Record<string, unknown>> = {
  profile: SocialProfile;
  providerExtras: TProviderExtras;
};

export type SocialProvider<
  TProviderExtras extends Record<string, unknown> = Record<string, unknown>
> = {
  name: string;
  validate: (
    request: SocialValidation
  ) => Promise<ValidationResult<TProviderExtras>>;
  createAuthorizationUrl?: () => Promise<{ authUrl: string; nonce: string }>;
  init?: () => Promise<void>;
  addMemberOnCreate?: {
    organizationId: string;
    roleMap: (result: ValidationResult<TProviderExtras>) => Role[];
  };
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

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  name!: SocialProfileName;

  @ApiProperty()
  email?: string;

  @ApiProperty()
  emailVerified?: boolean;
}

export type SocialValidation = SocialRequest & {
  idToken?: string;
  accessToken: string;
};

export type SocialRequest = {
  provider: string;
};
