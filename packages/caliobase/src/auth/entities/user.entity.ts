import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { PrimaryGeneratedPrefixedNanoIdColumn } from '../../entity-module/decorators/PrimaryGeneratedPrefixedNanoIdColumn.decorator';

@Entity()
export class User {
  @PrimaryGeneratedPrefixedNanoIdColumn('user')
  @ApiProperty()
  id!: string;

  @Column({ unique: true })
  @ApiProperty()
  email!: string;

  @Column({ default: false })
  @ApiProperty()
  emailVerified!: boolean;
}
