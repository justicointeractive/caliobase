import { Body, Controller, Get, Post, Type } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Type as TransformType } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { pick } from 'lodash';
import { DataSource } from 'typeorm';
import {
  AuthService,
  CreateOrganizationRequest,
  CreateUserRequest,
  LabeledSocialProvider,
  Member,
  Organization,
  SocialProvider,
  User,
} from '.';
import { CaliobaseConfig } from '../config';
import { AllRoles, Role } from '../entity-module/roles';
import { CaliobaseAuthCreateProfileRequests } from './auth.module';
import { Public } from './decorators/public.decorator';

export function createRootController<
  TUser extends CreateUserRequest,
  TOrganization extends CreateOrganizationRequest
>({
  createProfileRequests: { CreateUserProfile, CreateOrganizationProfile },
  socialProviders,
}: {
  createProfileRequests: CaliobaseAuthCreateProfileRequests<
    TUser,
    TOrganization
  >;
  socialProviders: SocialProvider[];
}): Type<unknown> {
  class GetRootResponse {
    @ApiProperty()
    hasRootMember!: boolean;

    @ApiProperty()
    rootOrgId!: string;

    @ApiProperty({
      enum: AllRoles,
      enumName: 'Role',
      isArray: true,
    })
    allRoles!: Role[];

    @ApiProperty({
      type: LabeledSocialProvider,
      isArray: true,
    })
    socialProviders!: LabeledSocialProvider[];

    @ApiProperty()
    allowCreateOwnOrganizations!: boolean;
  }

  class CreateRootRequest {
    @ValidateNested()
    @TransformType(() => CreateUserProfile)
    @ApiProperty({ type: CreateUserProfile })
    user!: InstanceType<typeof CreateUserProfile>;

    @ValidateNested()
    @TransformType(() => CreateOrganizationProfile)
    @ApiProperty({ type: CreateOrganizationProfile })
    organization!: InstanceType<typeof CreateOrganizationProfile>;
  }

  @ApiTags('root')
  @Controller('root')
  class RootController {
    orgRepo = this.dataSource.getRepository(Organization);
    memberRepo = this.dataSource.getRepository(Member);

    constructor(
      private dataSource: DataSource,
      private authService: AuthService,
      private config: CaliobaseConfig
    ) {}

    async assertHasNoRootMember() {
      if (await this.getHasRootMember()) {
        throw new Error('this can only be called once upon initial setup');
      }
    }

    async getHasRootMember() {
      const rootOrg = await this.orgRepo.findOne({
        where: { id: Organization.RootId },
      });

      if (rootOrg == null) {
        return false;
      }

      const rootMember = await this.memberRepo.findOne({
        where: {
          organization: rootOrg,
        },
      });

      if (rootMember == null) {
        return false;
      }

      return true;
    }

    @Public()
    @Get()
    @ApiOkResponse({ type: () => GetRootResponse })
    async getRoot() {
      return <GetRootResponse>{
        hasRootMember: await this.getHasRootMember(),
        rootOrgId: Organization.RootId,
        allRoles: AllRoles,
        socialProviders: socialProviders.map((p) => pick(p, ['name', 'label'])),
        allowCreateOwnOrganizations: this.config.allowCreateOwnOrganizations,
      };
    }

    @Public()
    @Post()
    @ApiBody({ type: () => CreateRootRequest })
    @ApiCreatedResponse({ type: Member })
    async createRoot(@Body() body: CreateRootRequest) {
      await this.assertHasNoRootMember();

      const user: User = await this.authService.createUserWithPassword(
        body.user
      );

      const organization: Organization = await this.orgRepo.save(
        this.orgRepo.create({
          id: Organization.RootId,
        })
      );

      const member: Member = await this.memberRepo.save(
        this.memberRepo.create({
          user,
          organization,
          roles: ['owner'],
        })
      );

      return member;
    }
  }

  return RootController;
}
