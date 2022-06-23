import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Organization {
  static PublicId = '00000000-0000-0000-0000-000000000000';

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: '' })
  name!: string;
}
