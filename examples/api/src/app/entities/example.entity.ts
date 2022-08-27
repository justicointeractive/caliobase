import {
  CaliobaseEntity,
  PrimaryGeneratedPrefixedNanoIdColumn,
} from '@caliobase/caliobase';
import { Column } from 'typeorm';

@CaliobaseEntity()
export class Example {
  @PrimaryGeneratedPrefixedNanoIdColumn('example')
  id!: string;

  @Column()
  name!: string;
}
