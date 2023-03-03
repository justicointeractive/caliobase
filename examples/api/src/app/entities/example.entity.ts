import {
  CaliobaseEntity,
  PrimaryGeneratedPrefixedNanoIdColumn,
} from '@caliobase/caliobase';
import type { OutputData } from '@editorjs/editorjs';
import { IsObject, IsString } from 'class-validator';
import { Column } from 'typeorm';

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

  @Column({ type: 'simple-json', nullable: true })
  @IsObject()
  blocks?: OutputData;
}
