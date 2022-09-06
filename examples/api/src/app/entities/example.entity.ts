import {
  CaliobaseEntity,
  PrimaryGeneratedPrefixedNanoIdColumn,
} from '@caliobase/caliobase';
import { IsString } from 'class-validator';
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
}
