import { faker } from '@faker-js/faker';
import { CreateUserRequest } from '../auth/auth.service';
import cryptoRandomString = require('crypto-random-string');

export function fakeUser(): CreateUserRequest {
  const fakeUser = {
    email: faker.internet
      .email()
      .replace(/\d*@/, `${cryptoRandomString({ length: 10 })}@`),
    givenName: faker.name.firstName(),
    familyName: faker.name.lastName(),
    password: faker.internet.password(),
  };
  return fakeUser;
}
