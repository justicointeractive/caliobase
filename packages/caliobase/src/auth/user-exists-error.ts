import { UnauthorizedException } from '@nestjs/common';

export class UserExistsError extends UnauthorizedException {
  constructor() {
    super('User already exists');
  }
}
