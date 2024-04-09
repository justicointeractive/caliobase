import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, Roles } from '../../entity-module';

export const ALLOWED_ROLES = Symbol('allowed_roles');

export const RequireRoleOrHigher = (role: Role): PropertyDecorator =>
  SetMetadata(ALLOWED_ROLES, Roles.fromMiniumLevel(role));

export const GetAllowedRoles = (
  reflector: Reflector,
  context: ExecutionContext
) =>
  reflector.getAllAndOverride(ALLOWED_ROLES, [
    context.getHandler(),
    context.getClass(),
  ]) as Role[] | undefined;
