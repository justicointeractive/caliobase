import { Body, Controller, Get, Post, Type } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Type as TransformType } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { DataSource } from 'typeorm';
import { AuthService, Member, Organization, User } from '../auth';
import { CaliobaseAuthProfileEntities } from '../auth/auth.module';
import { Public } from '../auth/decorators/public.decorator';
import {
  AbstractOrganizationProfile,
  AbstractUserProfile,
} from '../auth/profiles.service';
import { AllRoles, Role } from '../entity-module/roles';
import { getEntityDtos } from '../lib/getEntityDtos';

export function createMetaController({
  profileEntities: { UserProfile, OrganizationProfile },
}: {
  profileEntities: CaliobaseAuthProfileEntities;
}): Type<unknown> {
  const { CreateEntityDto: CreateUserProfileEntityDto } = UserProfile
    ? getEntityDtos(UserProfile)
    : { CreateEntityDto: null };

  const { CreateEntityDto: CreateOrganizationProfileEntityDto } =
    OrganizationProfile
      ? getEntityDtos(OrganizationProfile)
      : { CreateEntityDto: null };

  class GetMetaResponse {
    @ApiProperty()
    hasRootMember!: boolean;

    @ApiProperty()
    publicOrgId!: string;

    @ApiProperty()
    rootOrgId!: string;

    @ApiProperty({
      enum: AllRoles,
      enumName: 'Role',
      isArray: true,
    })
    allRoles!: Role[];
  }

  // TODO this should come from auth controller somehow
  class UserSignupBody {
    @IsString()
    @ApiProperty()
    email!: string;

    @IsString()
    @ApiProperty()
    password!: string;

    profile!: AbstractUserProfile | null;
  }

  if (CreateUserProfileEntityDto) {
    Reflect.decorate(
      [
        ApiProperty({ type: CreateUserProfileEntityDto }),
        ValidateNested(),
        TransformType(() => CreateUserProfileEntityDto),
      ],
      UserSignupBody.prototype,
      'profile'
    );
  }
  class CreateOrganizationRequest {
    profile!: AbstractOrganizationProfile | null;
  }

  if (CreateOrganizationProfileEntityDto) {
    Reflect.decorate(
      [
        ApiProperty({ type: CreateOrganizationProfileEntityDto }),
        ValidateNested(),
        TransformType(() => CreateOrganizationProfileEntityDto),
      ],
      CreateOrganizationRequest.prototype,
      'profile'
    );
  }

  class CreateRootRequest {
    @ValidateNested()
    @TransformType(() => UserSignupBody)
    @ApiProperty()
    user!: UserSignupBody;

    @ValidateNested()
    @TransformType(() => CreateOrganizationRequest)
    @ApiProperty()
    organization!: CreateOrganizationRequest;
  }

  @ApiTags('meta')
  @Controller('meta')
  class MetaController {
    orgRepo = this.dataSource.getRepository(Organization);
    memberRepo = this.dataSource.getRepository(Member);

    constructor(
      private dataSource: DataSource,
      private authService: AuthService
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
    @ApiOkResponse({ type: () => GetMetaResponse })
    async getMeta() {
      return <GetMetaResponse>{
        hasRootMember: await this.getHasRootMember(),
        rootOrgId: Organization.RootId,
        allRoles: AllRoles,
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

  return MetaController;
}
