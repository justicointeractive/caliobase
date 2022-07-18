import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne } from 'typeorm';
import { EntityOwner } from '../auth/decorators/owner.decorator';
import { Organization } from '../auth/entities/organization.entity';
import { User } from '../auth/entities/user.entity';
import { PrimaryGeneratedPrefixedNanoIdColumn } from '../entity-module/decorators/PrimaryGeneratedPrefixedNanoIdColumn.decorator';

@Entity()
export class ObjectStorageObject {
  @PrimaryGeneratedPrefixedNanoIdColumn('blob')
  @ApiProperty()
  id!: string;

  @EntityOwner()
  @ApiProperty()
  organization!: Organization;

  @Column()
  @ApiProperty()
  key!: string;

  @Column()
  @ApiProperty()
  cdnUrl!: string;

  @Column()
  @ApiProperty()
  contentLength!: number;

  @Column()
  @ApiProperty()
  contentType!: string;

  @Column({ type: String })
  @ApiProperty()
  status!: ObjectStorageObjectStatus;

  @ManyToOne(() => User)
  @ApiProperty()
  uploadedBy!: User;
}

export const ObjectStorageObjectStatuses = [
  'pending',
  'processing',
  'ready',
] as const;

export type ObjectStorageObjectStatus =
  typeof ObjectStorageObjectStatuses[number];
