import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { PrimaryGeneratedPrefixedNanoIdColumn } from '../../entity-module/decorators/PrimaryGeneratedPrefixedNanoIdColumn.decorator';
import { AbstractUserProfile } from './abstract-user-profile.entity';
import { BaseEntity } from './base.entity';

@Entity()
export class User<
  TProfile extends AbstractUserProfile = AbstractUserProfile
> extends BaseEntity {
  @PrimaryGeneratedPrefixedNanoIdColumn('user')
  @ApiProperty()
  id!: string;

  @Column({ unique: true })
  @ApiProperty()
  email!: string;

  @Column({ default: false })
  @ApiProperty()
  emailVerified!: boolean;

  profile?: TProfile;
}
