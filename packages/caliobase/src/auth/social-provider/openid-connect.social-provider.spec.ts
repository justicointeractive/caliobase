import { OpenIdConnectSocialProvider } from './openid-connect.social-provider';

describe('social provider', () => {
  describe('openid connect', () => {
    it('should create instance with provider claims', () => {
      new OpenIdConnectSocialProvider<{ roles?: string[] }>({
        key: 'test',
        label: 'Test',
        clientId: 'test',
        clientSecret: 'test',
        issuer: 'test',
        redirectUri: 'https://test.com',
        mapToMembership: ({ providerTokenClaims }) => ({
          organizationId: 'test123',
          role: [
            providerTokenClaims.roles?.includes('Admin') ? 'owner' : 'guest',
          ],
        }),
      });
    });
  });
});
