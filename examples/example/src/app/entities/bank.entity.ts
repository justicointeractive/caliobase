import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Column, ManyToOne } from 'typeorm';

import {
  Acl,
  CaliobaseEntity,
  EntityAcl,
  EntityOwner,
  Organization,
  PrimaryGeneratedPrefixedNanoIdColumn,
  QueryProperty,
} from '@caliobase/caliobase';

@CaliobaseEntity({ controller: { name: 'bank' } })
export class Bank {
  @ApiProperty()
  @PrimaryGeneratedPrefixedNanoIdColumn('bank')
  id!: string;

  @ApiProperty()
  @Column({ nullable: true })
  @IsUUID()
  @IsOptional()
  forkedFromId?: string;

  @ApiHideProperty()
  @ManyToOne(() => Bank, { onDelete: 'SET NULL' })
  forkedFrom?: Bank;

  @ApiProperty()
  @QueryProperty()
  @Column({ default: 1 })
  @IsNumber()
  rank!: number;

  @ApiProperty()
  @QueryProperty()
  @Column()
  @IsString()
  name!: string;

  @ApiProperty()
  @Column({ type: 'jsonb' })
  @Type(() => BankChannel)
  @ValidateNested({ each: true })
  channels!: BankChannel[];

  @ApiProperty()
  @EntityOwner()
  organization!: Organization;

  @EntityAcl(Bank)
  acl!: Acl<Bank>;
}

export class BankChannel {
  @IsBoolean()
  lockout!: boolean;

  @IsString()
  tag!: string;

  @IsString()
  @Matches(/^\d{1,3}([.]\d{1,4})?$/)
  frequency!: string;

  @IsString()
  modulation!: string;

  @IsString()
  ctcssDcs!: string;

  @IsNumber()
  delay!: number;

  @IsBoolean()
  priority!: boolean;
}
