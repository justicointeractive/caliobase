import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { CaliobaseEntity, RequireWriteAccessLevel } from '@caliobase/caliobase';

import { Configuration } from './configuration.entity';

@CaliobaseEntity()
export class Note {
  @PrimaryGeneratedColumn('uuid')
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
