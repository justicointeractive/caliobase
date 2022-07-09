import { faker } from '@faker-js/faker';
import { CreateUserRequest } from '../auth/auth.service';
import cryptoRandomString = require('crypto-random-string');

export function fakeUser(): CreateUserRequest {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const fakeUser = {
    email: faker.internet
      .email(firstName, lastName)
      .replace(/\d*@/, `${cryptoRandomString({ length: 10 })}@`),
    givenName: firstName,
    familyName: lastName,
    password: faker.internet.password(),
  };
  return fakeUser;
}