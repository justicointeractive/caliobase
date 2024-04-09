import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { CaliobaseRequestUser } from '../..';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { GetAllowedRoles } from '../decorators/role.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  override handleRequest<
    TUser extends CaliobaseRequestUser = CaliobaseRequestUser
  >(err: Error, user: TUser, info: unknown, context: ExecutionContext): TUser {
    if (err) throw err;

    const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPublic && !user) {
      throw new UnauthorizedException();
    }

    const allowedRoles = GetAllowedRoles(this.reflector, context);
    if (
      allowedRoles &&
      !allowedRoles.some((role) => (user.member?.roles || []).includes(role))
    ) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
