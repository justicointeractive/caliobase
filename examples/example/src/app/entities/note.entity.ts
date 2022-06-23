import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { RequireWriteAccessLevel } from '@caliobase/caliobase';

import { Configuration } from './configuration.entity';

@Entity()
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiHideProperty()
  @ManyToOne(() => Configuration)
  @RequireWriteAccessLevel('writer')
  configuration!: Configuration;

  @Column()
  note!: string;
}
