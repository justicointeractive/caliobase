export const SocialProvidersToken = Symbol('SOCIAL_PROVIDERS');

export type SocialProvider = {
  name: string;
  validate: (request: SocialValidation) => Promise<SocialProfile>;
  createAuthorizationUrl?: () => Promise<{ authUrl: string; nonce: string }>;
  init?: () => Promise<void>;
};

export type SocialProfile = {
  provider: string;
  providerUserId: string;
  accessToken: string;
  name: {
    givenName?: string;
    familyName?: string;
  };
  email: string;
  emailVerified?: boolean;
};

export type SocialValidation = SocialRequest & {
  accessToken: string;
};

export type SocialRequest = {
  provider: string;
};
