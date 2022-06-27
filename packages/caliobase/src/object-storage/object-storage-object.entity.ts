import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization, User } from '../auth';

@Entity()
export class ObjectStorageObject {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id!: string;

  @ManyToOne(() => Organization)
  @ApiProperty()
  owner!: Organization;

  @Column()
  @ApiProperty()
  key!: string;

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
