import { EntityOwner } from '../auth/decorators/owner.decorator';
import { Organization } from '../auth/entities/organization.entity';

export class AbstractOrganizationOwnedEntity {
  @EntityOwner()
  organization!: Organization;
}
