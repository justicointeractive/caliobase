import { JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Organization } from './organization.entity';

export class AbstractOrganizationProfile {
  @PrimaryColumn()
  organizationId!: string;

  @OneToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn()
  organization!: Organization;
}
