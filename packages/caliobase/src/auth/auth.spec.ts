import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { omit } from 'lodash';
import { SendMailOptions } from 'nodemailer';
import nodemailerMock from 'nodemailer-mock';
import {
  createTestOrganization,
  createTestingModule,
  useTestingModule,
} from '../test/createTestingModule';
import { fakeUser } from '../test/fakeUser';
import { AbstractAuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Member } from './entities/member.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationService } from './organization.service';
import { UserExistsError } from './user-exists-error';

describe('auth', () => {
  const { userService } = useTestingModule(async () => {
    const module = await createTestingModule();
    const userService = module.get(AbstractAuthController<any>);
    return { module, userService };
  });

  it('should login user with password', async () => {
    const userDetails = fakeUser();
    const user = await userService.createUserWithPassword(userDetails);
    const loggedInUser = await userService.loginUser(userDetails);
    expect(loggedInUser).toMatchObject({
      accessToken: expect.stringContaining(''),
      user: omit(user.user, ['profile']),
    });
    await expect(
      async () =>
        await userService.loginUser({
          email: userDetails.email,
          password: 'not the right password',
        })
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      async () =>
        await userService.loginUser({
          email: '',
          password: userDetails.password,
        })
    ).rejects.toThrow(BadRequestException);
    await expect(
      async () =>
        await userService.loginUser({
          email: 'not the right email@foo.com',
          password: 'not the right password',
        })
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      async () =>
        await userService.loginUser({
          email: userDetails.email,
          password: '',
        })
    ).rejects.toThrow(BadRequestException);
  });

  it('should login user with email otp', async () => {
    const userDetails = fakeUser();
    const { user } = await userService.createUserWithoutPassword(userDetails);

    await expect(
      async () => await userService.createUserWithoutPassword(userDetails)
    ).rejects.toThrow(UserExistsError);

    await userService.sendOtpByEmail({
      email: userDetails.email,
    });

    const otp = extractHtmlContent(
      nodemailerMock.mock.getSentMail().at(-1),
      '[data-otp]'
    );

    if (!otp) {
      throw new Error('otp not found in email');
    }

    const loggedInUser = await userService.loginUserWithOtp({
      email: userDetails.email,
      otp: otp,
    });
    expect(loggedInUser).toMatchObject({
      accessToken: expect.stringContaining(''),
      user: omit(user, ['profile']),
    });
    // don't allow reusing the otp
    await expect(
      async () =>
        await userService.loginUserWithOtp({
          email: userDetails.email,
          otp: otp,
        })
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      async () =>
        await userService.loginUserWithOtp({
          email: userDetails.email,
          otp: 'not the right otp',
        })
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      async () =>
        await userService.loginUserWithOtp({
          email: '',
          otp: otp,
        })
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      async () =>
        await userService.loginUserWithOtp({
          email: 'not-the-right-email@example.org',
          otp: otp,
        })
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      async () =>
        await userService.loginUserWithOtp({
          email: userDetails.email,
          otp: '',
        })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should treat email as case insensitive', async () => {
    const userDetails = fakeUser();
    const user = await userService.createUserWithPassword(userDetails);
    const loggedInUser = await userService.loginUser({
      email: userDetails.email.toUpperCase(),
      password: userDetails.password,
    });
    expect(loggedInUser).toMatchObject({
      accessToken: expect.stringContaining(''),
      user: omit(user.user, ['profile']),
    });
  });

  describe('get me', () => {
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

  describe('self join root organization', () => {
    const { module, userService, orgService } = useTestingModule(async () => {
      const module = await createTestingModule({
        guestRole: 'guest',
      });

      const userService = module.get<AuthService>(AuthService);
      const orgService = module.get<OrganizationService>(OrganizationService);

      return {
        module,
        userService,
        orgService,
      };
    });

    it('should allow a user to join themselves to an organization as a guest', async () => {
      const { organization } = await createTestOrganization(module);

      const otherUser = await userService.createUserWithPassword(fakeUser());
      const otherMember = await orgService.joinAsGuest(organization, otherUser);
      expect(otherMember).toMatchObject({
        organization: { id: organization.id },
        user: { id: otherUser.id },
        roles: ['guest'],
      });
    });
  });
});

function extractHtmlContent(sent: SendMailOptions, selector: string) {
  if (typeof sent.html !== 'string' && !Buffer.isBuffer(sent.html)) {
    throw new Error('Invalid HTML content');
  }
  const jsdomContext = new JSDOM(sent.html);
  const doc = jsdomContext.window.document;
  const textContent = doc.querySelector(selector)?.textContent;
  return textContent;
}
