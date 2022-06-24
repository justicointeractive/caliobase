import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class PasswordResetToken {
  @PrimaryColumn()
  token!: string;

  @Column()
  validUntil!: Date;

  @ManyToOne(() => User)
  user!: User;
}
