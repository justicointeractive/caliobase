import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { Column, OneToMany } from 'typeorm';

import {
  Acl,
  CaliobaseEntity,
  EntityAcl,
  EntityOwner,
  Organization,
  PrimaryGeneratedPrefixedNanoIdColumn,
  QueryProperty,
  RelationController,
} from '@caliobase/caliobase';

import { ConfigurationBank } from './configuration-bank.entity';
import { Note } from './note.entity';

@CaliobaseEntity({ controller: { name: 'configuration' } })
export class Configuration {
  @PrimaryGeneratedPrefixedNanoIdColumn('conf')
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
