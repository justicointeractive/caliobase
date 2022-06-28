import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { RequireWriteAccessLevel } from '@caliobase/caliobase';

import { Configuration } from './configuration.entity';

@Entity()
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
