import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id!: string;

  @Column({ unique: true })
  @ApiProperty()
  email!: string;

  @Column()
  @ApiProperty()
  givenName!: string;

  @Column()
  @ApiProperty()
  familyName!: string;
}
