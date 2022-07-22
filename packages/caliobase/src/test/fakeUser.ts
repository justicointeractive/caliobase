import { faker } from '@faker-js/faker';
import { CreateUserRequest } from '../auth/auth.service';
import { AbstractUserProfile } from '../auth/entities/abstract-user-profile.entity';
import cryptoRandomString = require('crypto-random-string');

export function fakeUser(): CreateUserRequest {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const fakeUser = {
    email: faker.internet
      .email(firstName, lastName)
      .replace(/\d*@/, `${cryptoRandomString({ length: 10 })}@`),
    password: faker.internet.password(),
    profile: { firstName, lastName } as Partial<AbstractUserProfile>,
  };
  return fakeUser;
}
