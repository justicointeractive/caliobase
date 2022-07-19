import { faker } from '@faker-js/faker';
import jestMockAxios from 'jest-mock-axios';

import {
  createTestingModule,
  useTestingModule,
} from '../../test/createTestingModule';
import { AuthService } from '../auth.service';

describe('social provider', () => {
  describe('facebook', () => {
    beforeAll(() => {
      jest.mock('axios', jestMockAxios);
    });

    const { module } = useTestingModule(async () => {
      return {
        module: await createTestingModule({}),
      };
    });

    it('should create user', async () => {
      const auth = module.get(AuthService);
      const result = auth.validateSocial({
        provider: 'facebook',
        accessToken: '',
      });
      const user = {
        id: faker.random.numeric(10),
        first_name: faker.name.firstName(),
        last_name: faker.name.lastName(),
        email: faker.internet.email(),
      };
      jestMockAxios.mockResponseFor(
        {
          method: 'GET',
          url: 'https://graph.facebook.com/v11.0/me',
          params: {
            fields: 'id,first_name,last_name,email',
            access_token: '',
          },
        },
        {
          data: user,
        }
      );
      expect(await result).toMatchObject({
        user: expect.objectContaining({
          email: user.email,
          profile: expect.objectContaining({
            firstName: user.first_name,
            lastName: user.last_name,
          }),
        }),
      });
    });
  });
  describe('invalid', () => {
    const { module } = useTestingModule(async () => {
      return {
        module: await createTestingModule({}),
      };
    });

    it('should fail for invalid social provider', async () => {
      const auth = module.get(AuthService);
      await expect(async () => {
        await auth.validateSocial({
          provider: 'invalid',
          accessToken: '',
        });
      }).rejects.toThrow();
      expect;
    });
  });
});
