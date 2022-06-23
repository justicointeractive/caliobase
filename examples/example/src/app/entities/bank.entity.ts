import { Controller } from '@nestjs/common';
import { ApiHideProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested
} from 'class-validator';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import {
  Acl,
  EntityAcl,
  EntityOwner,
  Organization,
  QueryProperty
} from '@caliobase/caliobase';

@Entity()
@Controller('bank')
@ApiTags('bank')
export class Bank {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  @IsUUID()
  @IsOptional()
  forkedFromId?: string;

  @ApiHideProperty()
  @ManyToOne(() => Bank, { onDelete: 'SET NULL' })
  forkedFrom?: Bank;

  @QueryProperty()
  @Column({ default: 1 })
  @IsNumber()
  rank!: number;

  @QueryProperty()
  @Column()
  @IsString()
  name!: string;

  @Column({ type: 'jsonb' })
  @Type(() => BankChannel)
  @ValidateNested({ each: true })
  channels!: BankChannel[];

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
