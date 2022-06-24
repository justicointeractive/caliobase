import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Organization {
  static PublicId = '00000000-0000-0000-0000-000000000000';
  static RootId = '00000000-0000-0000-0000-000000000001';

  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id!: string;

  @Column({ default: '' })
  @ApiProperty()
  name!: string;
}
