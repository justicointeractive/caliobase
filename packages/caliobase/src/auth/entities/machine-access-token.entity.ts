import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { PrimaryGeneratedPrefixedNanoIdColumn } from '../../entity-module/decorators/PrimaryGeneratedPrefixedNanoIdColumn.decorator';
import { Role } from '../../entity-module/roles';
import { User } from './user.entity';
import { Organization } from './organization.entity';

@Entity()
@Index(['tokenHash'], { unique: true })
export class MachineAccessToken {
  @PrimaryGeneratedPrefixedNanoIdColumn('mat')
  @ApiProperty()
  id!: string;

  @Column()
  @ApiProperty()
  name!: string;

  @Column()
  tokenHash!: string;

  @Column()
  @ApiProperty()
  tokenPrefix!: string;

  @Column()
  @ApiProperty()
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @Column()
  @ApiProperty()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'simple-json' })
  @ApiProperty({
    enum: ['owner', 'manager', 'writer', 'moderator', 'guest'],
    isArray: true,
  })
  roles!: Role[];

  @Column()
  @ApiProperty()
  createdByUserId!: string;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser!: User;

  @CreateDateColumn()
  @ApiProperty()
  createdAt!: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updatedAt!: Date;

  @Column({ nullable: true })
  @ApiProperty({ required: false, nullable: true })
  revokedAt?: Date;

  @Column({ nullable: true })
  @ApiProperty({ required: false, nullable: true })
  lastUsedAt?: Date;
}
