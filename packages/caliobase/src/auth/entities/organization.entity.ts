import { ApiProperty } from '@nestjs/swagger';
import { Entity } from 'typeorm';
import { PrimaryGeneratedPrefixedNanoIdColumn } from '../../entity-module/decorators/PrimaryGeneratedPrefixedNanoIdColumn.decorator';

@Entity()
export class Organization {
  static RootId = 'org_0';

  @PrimaryGeneratedPrefixedNanoIdColumn('org')
  @ApiProperty()
  id!: string;
}
