export const SocialProvidersToken = Symbol('SOCIAL_PROVIDERS');

export type SocialProvider = {
  name: string;
  validate: (request: SocialValidation) => Promise<SocialProfile>;
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

export type SocialValidation = {
  provider: string;
  accessToken: string;
};
