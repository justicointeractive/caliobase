import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Column, ManyToOne } from 'typeorm';

import {
  CaliobaseEntity,
  PrimaryGeneratedPrefixedNanoIdColumn,
  RequireWriteAccessLevel,
} from '@caliobase/caliobase';

import { Configuration } from './configuration.entity';

@CaliobaseEntity()
export class Note {
  @PrimaryGeneratedPrefixedNanoIdColumn('note')
  @ApiProperty()
  id!: string;

  @ApiHideProperty()
  @ManyToOne(() => Configuration)
  @RequireWriteAccessLevel('writer')
  configuration!: Configuration;

  @Column()
  @ApiProperty()
  note!: string;
}
