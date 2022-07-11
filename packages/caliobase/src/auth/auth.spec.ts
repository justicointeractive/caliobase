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
      const invitation = await orgService.createInvitation(owner, ['writer']);
      otherMember = await orgService.claimInvitation(
        otherUser.id,
        invitation.token
      );
      expect(await orgService.findUserMemberships(otherUser.id)).toMatchObject([
        {
          organizationId: organization.id,
          userId: otherUser.id,
          roles: ['writer'],
        },
      ]);
    });

    it('should not allow users to grant higher levels of access than themselves', async () => {
      await expect(async () => {
        await orgService.createInvitation(otherMember, ['manager']);
      }).rejects.toThrow(UnauthorizedException);
    });

    it('should be allowed to demote another user', async () => {
      expect(
        await orgService.updateMember(owner, otherMember, {
          roles: ['moderator'],
        })
      ).toMatchObject({
        organizationId: organization.id,
        userId: otherMember.userId,
        roles: ['moderator'],
      });
    });

    it('should not be allowed to demote a user higher than self', async () => {
      await expect(
        async () =>
          await orgService.updateMember(otherMember, owner, {
            roles: ['guest'],
          })
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
