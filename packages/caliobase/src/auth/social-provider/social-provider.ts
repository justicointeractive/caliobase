import { ApiProperty } from '@nestjs/swagger';

export const SocialProvidersToken = Symbol('SOCIAL_PROVIDERS');

export type SocialProvider = {
  name: string;
  validate: (request: SocialValidation) => Promise<SocialProfile>;
  createAuthorizationUrl?: () => Promise<{ authUrl: string; nonce: string }>;
  init?: () => Promise<void>;
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
  accessToken: string;
};

export type SocialRequest = {
  provider: string;
};
