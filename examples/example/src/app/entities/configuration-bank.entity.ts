import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString, IsUUID } from 'class-validator';
import { Column, ManyToOne, PrimaryColumn } from 'typeorm';

import { CaliobaseEntity, RequireWriteAccessLevel } from '@caliobase/caliobase';

import { Bank } from './bank.entity';
import { Configuration } from './configuration.entity';

@CaliobaseEntity({ controller: { name: 'configuration-bank' } })
export class ConfigurationBank {
  @PrimaryColumn()
  @IsUUID()
  @IsString()
  @ApiProperty()
  configurationId!: string;

  @ApiHideProperty()
  @ManyToOne(() => Configuration, { onDelete: 'CASCADE' })
  @RequireWriteAccessLevel('writer')
  configuration!: Configuration;

  @PrimaryColumn()
  @IsUUID()
  @IsString()
  @ApiProperty()
  bankId!: string;

  @ApiHideProperty()
  @ManyToOne(() => Bank, { onDelete: 'CASCADE' })
  @RequireWriteAccessLevel('guest')
  bank!: Bank;

  @Column({ default: 1 })
  @IsNumber()
  @ApiProperty()
  rank!: number;

  @Column()
  @IsBoolean()
  @ApiProperty()
  scanEnabled!: boolean;
}
