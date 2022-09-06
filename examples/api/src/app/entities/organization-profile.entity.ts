import {
  AbstractOrganizationProfile,
  CaliobaseEntity,
} from '@caliobase/caliobase';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Column } from 'typeorm';

@CaliobaseEntity({
  controller: { name: 'organization_profile' },
  accessPolicy: [
    {
      effect: 'allow',
      action: ['get'],
    },
    { effect: 'allow', action: '*', users: { role: 'owner' } },
  ],
})
export class OrganizationProfile extends AbstractOrganizationProfile {
  @IsString()
  @Column()
  @ApiProperty()
  name!: string;
}
