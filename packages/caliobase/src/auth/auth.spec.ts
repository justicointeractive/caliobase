import { UnauthorizedException } from '@nestjs/common';
import {
  createTestingModule,
  createTestOrganization,
  useTestingModule,
} from '../test/createTestingModule';
import { fakeUser } from '../test/fakeUser';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Member, Organization } from './entities';
import { OrganizationService } from './organization.service';

describe('auth', () => {
  describe('get me', () => {
    const { userService } = useTestingModule(async () => {
      const module = await createTestingModule();
      const userService = module.get(AuthController);
      return { module, userService };
    });

    it('should get me properly', async () => {
      const user1 = await userService.createUserWithPassword(fakeUser());
      expect(
        await userService.getMe({
          user: { user: user1.user, organization: null, member: null },
        })
      ).toMatchObject({ user: user1.user, organization: null, member: null });
      const user2 = await userService.createUserWithPassword(fakeUser());
      expect(
        await userService.getMe({
          user: { user: user2.user, organization: null, member: null },
        })
      ).toMatchObject({ user: user2.user, organization: null, member: null });
    });
  });

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

    it('should not be allowed to remove a user higher than self', async () => {
      await expect(
        async () => await orgService.removeMember(otherMember, owner)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should be allowed to remove a user lower than self', async () => {
      expect(await orgService.removeMember(owner, otherMember)).not.toBeNull();
    });

    it('removed user should not be in member list', async () => {
      expect(
        await orgService.findOrganizationMembers(owner.organizationId)
      ).toHaveLength(1);
    });
  });
});
