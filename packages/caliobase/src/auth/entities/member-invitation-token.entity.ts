import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity()
export class MemberInvitationToken {
  @PrimaryColumn()
  token!: string;

  @Column()
  validUntil!: Date;

  @ManyToOne(() => Organization)
  organization!: Organization;
}
