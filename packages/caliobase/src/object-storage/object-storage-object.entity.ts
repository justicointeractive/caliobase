import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Column, Entity, ManyToOne } from 'typeorm';
import { EntityOwner } from '../auth/decorators/owner.decorator';
import { Organization } from '../auth/entities/organization.entity';
import { User } from '../auth/entities/user.entity';
import { PrimaryGeneratedPrefixedNanoIdColumn } from '../entity-module/decorators/PrimaryGeneratedPrefixedNanoIdColumn.decorator';

export const ObjectStorageObjectStatuses = [
  'pending',
  'processing',
  'ready',
] as const;

export type ObjectStorageObjectStatus =
  typeof ObjectStorageObjectStatuses[number];

@Entity()
export class ObjectStorageObject {
  @PrimaryGeneratedPrefixedNanoIdColumn('blob')
  @ApiProperty()
  id!: string;

  @EntityOwner()
  @ApiProperty()
  organization!: Organization;

  @Column({ nullable: true })
  @ApiProperty()
  externalId?: string;

  @Column()
  @ApiProperty()
  key!: string;

  @Column()
  @ApiProperty()
  cdnUrl!: string;

  @Column({ type: 'bigint' })
  @ApiProperty()
  contentLength!: number;

  @Column()
  @ApiProperty()
  contentType!: string;

  @Column({ type: String })
  @ApiProperty({ type: String, enum: ObjectStorageObjectStatuses })
  status!: ObjectStorageObjectStatus;

  @ManyToOne(() => User, { nullable: true })
  @ApiProperty()
  @IsOptional()
  uploadedBy?: User;
}
