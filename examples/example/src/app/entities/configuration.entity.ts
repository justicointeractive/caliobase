import { Controller } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import {
  Acl,
  EntityAcl,
  EntityOwner,
  Organization,
  QueryProperty,
  RelationController,
} from '@caliobase/caliobase';

import { ConfigurationBank } from './configuration-bank.entity';
import { Note } from './note.entity';

@Entity()
@Controller('configuration')
@ApiTags('configuration')
export class Configuration {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty()
  id!: string;

  @QueryProperty()
  @Column({ default: 1 })
  @IsNumber()
  @ApiProperty()
  rank!: number;

  @QueryProperty()
  @Column({ default: '' })
  @IsString()
  @ApiProperty()
  name!: string;

  @RelationController()
  @OneToMany(() => ConfigurationBank, (cb) => cb.configuration, {
    eager: true,
    cascade: false,
  })
  @ApiProperty()
  banks!: ConfigurationBank[];

  @RelationController()
  @OneToMany(() => Note, (cb) => cb.configuration, {
    eager: true,
    cascade: false,
  })
  @ApiProperty()
  notes!: Note[];

  @EntityOwner()
  @ApiProperty()
  organization!: Organization;

  @EntityAcl(Configuration)
  acl!: Acl<Configuration>;
}
