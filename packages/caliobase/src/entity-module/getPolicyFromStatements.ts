import { Type, UnauthorizedException } from '@nestjs/common';
import { CaliobaseRequestUser, Organization } from '../auth';
import { getAclEntity } from '../auth/acl/getAclEntityAndProperty';
import { assert } from '../lib/assert';
import { unwrapValueWithContext } from '../lib/unwrapValueWithContext';
import {
  EffectivePolicy,
  PolicyStatements,
} from './decorators/AccessPolicies.decorator';
import { EntityActions, Roles } from './roles';

export function getPolicyFromStatements<TEntity>({
  entityType,
  action,
  policyStatements,
  organization,
  user,
}: {
  entityType: Type<TEntity>;
  action: EntityActions;
  policyStatements: PolicyStatements<TEntity> | undefined;
  organization?: Pick<Organization, 'id'>;
  user: CaliobaseRequestUser;
}) {
  if (user.organization?.id !== organization?.id) {
    throw new UnauthorizedException(
      'access token supplied is not applicable to this organization context'
    );
  }

  const policy = policyStatements
    ?.filter((statement) => {
      if (statement.effect === 'deny') {
        throw new Error('deny statements are not implemented');
      }
      if (statement.users) {
        const statementUsers = statement.users;
        if (typeof statementUsers === 'function') {
          if (!statementUsers(user)) {
            return false;
          }
        } else {
          if (statementUsers.role) {
            const allowedRoles = Array.isArray(statementUsers.role)
              ? statementUsers.role
              : Roles.fromMiniumLevel(statementUsers.role);
            const someUserRoleIsAllowed =
              user?.member?.roles?.some((role) =>
                allowedRoles.includes(role)
              ) ?? false;
            if (!someUserRoleIsAllowed) {
              return false;
            }
          }
        }
      }
      if (statement.action !== '*' && !statement.action.includes(action)) {
        return false;
      }
      return true;
    })
    .reduce(
      (agg, { effect, items }) => {
        return {
          ...agg,
          effect,
          itemFilters: [
            ...agg.itemFilters,
            items ? unwrapValueWithContext(items, { user }) : {},
          ],
        };
      },
      <EffectivePolicy<TEntity>>{
        effect: getAclEntity(entityType) ? 'allow' : 'deny',
        itemFilters: [],
      }
    );

  assert(
    policy?.effect !== 'deny',
    UnauthorizedException,
    `user is not authorized to perform '${action}' on '${entityType.name}'`
  );

  return policy;
}
