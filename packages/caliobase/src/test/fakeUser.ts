import { faker } from '@faker-js/faker';
import { CreateUserRequest } from '../auth/auth.service';

export function fakeUser(): CreateUserRequest {
  return {
    email: faker.internet.email(),
    givenName: faker.name.firstName(),
    familyName: faker.name.lastName(),
    password: faker.internet.password(),
  };
}
