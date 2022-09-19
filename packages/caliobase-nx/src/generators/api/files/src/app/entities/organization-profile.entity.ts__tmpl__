import {
  AbstractOrganizationProfile,
  CaliobaseEntity,
} from '@caliobase/caliobase';
import { Column } from 'typeorm';

@CaliobaseEntity({
  controller: { name: 'organization_profile' },
})
export class OrganizationProfile extends AbstractOrganizationProfile {
  @Column()
  name!: string;
}
