import { JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Organization } from './organization.entity';

export class AbstractOrganizationProfile extends BaseEntity {
  @PrimaryColumn()
  organizationId!: string;

  @OneToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn()
  organization!: Organization;
}
