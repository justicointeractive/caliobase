import {
  CaliobaseEntity,
  PrimaryGeneratedPrefixedNanoIdColumn,
} from '@caliobase/caliobase';
import type { OutputData } from '@editorjs/editorjs';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsObject, IsOptional, IsString } from 'class-validator';
import { Column, ManyToOne } from 'typeorm';
import { Image } from './image.entity';

@CaliobaseEntity({
  controller: {
    name: 'example',
  },
})
export class Example {
  @PrimaryGeneratedPrefixedNanoIdColumn('example')
  id!: string;

  @Column()
  @IsString()
  name!: string;

  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  imageId?: string;

  @Allow()
  @IsOptional()
  @ApiPropertyOptional()
  @ManyToOne(() => Image, { eager: true })
  image?: Image;

  @Column({ type: 'simple-json', nullable: true })
  @IsObject()
  @ApiPropertyOptional()
  blocks?: OutputData;
}
