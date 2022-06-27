import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization, User } from '../auth';

@Entity()
export class ObjectStorageObject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Organization)
  owner!: Organization;

  @Column()
  key!: string;

  @Column()
  contentLength!: number;

  @Column()
  contentType!: string;

  @Column({ type: String })
  status!: ObjectStorageObjectStatus;

  @ManyToOne(() => User)
  uploadedBy!: User;
}

export type ObjectStorageObjectStatus = 'pending' | 'processing' | 'ready';
