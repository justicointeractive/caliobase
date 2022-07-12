import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  override handleRequest<TUser = unknown>(
    err: Error,
    user: TUser,
    info: unknown,
    context: ExecutionContext
  ): TUser {
    if (err) throw err;

    const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPublic && !user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
