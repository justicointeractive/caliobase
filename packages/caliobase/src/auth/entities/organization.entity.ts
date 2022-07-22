import { ApiProperty } from '@nestjs/swagger';
import { Entity } from 'typeorm';
import { AbstractOrganizationProfile } from '.';
import { PrimaryGeneratedPrefixedNanoIdColumn } from '../../entity-module/decorators/PrimaryGeneratedPrefixedNanoIdColumn.decorator';

@Entity()
export class Organization<
  TProfile extends AbstractOrganizationProfile = AbstractOrganizationProfile
> {
  static RootId = 'org_0';

  @PrimaryGeneratedPrefixedNanoIdColumn('org')
  @ApiProperty()
  id!: string;

  profile?: TProfile;
}
