import { UnauthorizedException } from '@nestjs/common';
import {
  createTestingModule,
  createTestOrganization,
  useTestingModule,
} from '../test/createTestingModule';
import { fakeUser } from '../test/fakeUser';
import { AuthService } from './auth.service';
import { Member, Organization } from './entities';
import { OrganizationService } from './organization.service';

describe('auth', () => {
  describe('organization membership', () => {
    const { module, userService, orgService } = useTestingModule(async () => {
      const module = await createTestingModule({});

      const userService = module.get<AuthService>(AuthService);
      const orgService = module.get<OrganizationService>(OrganizationService);

      return {
        module,
        userService,
        orgService,
      };
    });

    let owner: Member;
    let organization: Organization;
    let otherMember: Member;

    it('should allow an invited user to join organization with a certain role', async () => {
      const created = await createTestOrganization(module);
      owner = created.owner.member;
      organization = created.organization;

      const otherUser = await userService.createUserWithPassword(fakeUser());
      const invitation = await orgService.createInvitation(
        organization.id,
        owner,
        ['writer']
      );
      otherMember = await orgService.claimInvitation(
        otherUser.id,
        invitation.token
      );
      expect(await orgService.findUserMemberships(otherUser.id)).toEqual([
        {
          organization: organization,
          organizationId: organization.id,
          roles: ['writer'],
          userId: otherUser.id,
        },
      ]);
    });

    it('should not allow users to grant higher levels of access than themselves', async () => {
      await expect(async () => {
        await orgService.createInvitation(organization.id, otherMember, [
          'manager',
        ]);
      }).rejects.toThrow(UnauthorizedException);
    });
  });
});