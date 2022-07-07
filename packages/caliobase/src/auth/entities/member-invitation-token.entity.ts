import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity()
export class MemberInvitationToken {
  @PrimaryColumn()
  @ApiProperty()
  token!: string;

  @Column()
  @ApiProperty()
  validUntil!: Date;

  @ApiProperty()
  @ManyToOne(() => Organization)
  organization!: Organization;
}
