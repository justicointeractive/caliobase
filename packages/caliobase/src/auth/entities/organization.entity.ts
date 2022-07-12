import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Organization {
  static RootId = '00000000-0000-0000-0000-000000000000';

  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id!: string;
}
