import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
export class PasswordResetToken extends BaseEntity {
  @PrimaryColumn()
  token!: string;

  @Column()
  validUntil!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;
}
