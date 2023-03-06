import {
  CaliobaseEntity,
  ObjectStorageObject,
  PrimaryGeneratedPrefixedNanoIdColumn,
} from '@caliobase/caliobase';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { Column, ManyToOne } from 'typeorm';

@CaliobaseEntity({ controller: { name: 'image' } })
export class Image {
  @PrimaryGeneratedPrefixedNanoIdColumn('img')
  id!: string;

  @Column()
  @IsNumber()
  @ApiProperty()
  width!: number;

  @Column()
  @IsNumber()
  @ApiProperty()
  height!: number;

  @Column()
  @IsString()
  @ApiProperty()
  objectStorageObjectId!: string;

  @ManyToOne(() => ObjectStorageObject, { eager: true })
  @ApiProperty()
  objectStorageObject!: ObjectStorageObject;
}
