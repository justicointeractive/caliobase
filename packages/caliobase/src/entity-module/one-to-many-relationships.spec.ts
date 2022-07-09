import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { createEntityModule } from '.';
import {
  createTestingModule,
  useTestingModule,
} from '../test/createTestingModule';
import { CaliobaseEntity, RelationController } from './decorators';

describe('one to many relationships', () => {
  @CaliobaseEntity({
    controller: { name: 'one' },
  })
  class Card {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @RelationController()
    @OneToMany(() => Note, (n) => n.one)
    notes!: Note[];
  }

  @Entity()
  class Note {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    text!: string;

    @ManyToOne(() => Card)
    one!: Card;
  }

  const { module, entityModule } = useTestingModule(async () => {
    const entityModule = createEntityModule(Card);

    const module = await createTestingModule({
      imports: [entityModule],
    });

    const noteController = entityModule.EntityControllers?.find(
      (c) => c.name === 'CardNoteRelationController'
    );

    console.log(
      noteController &&
        Object.getOwnPropertyNames(
          Object.getPrototypeOf(module.get<any>(noteController))
        )
    );

    return { module, entityModule };
  });

  it('should allow one to many relationships', async () => {
    expect(entityModule.EntityControllers).toHaveLength(2);
  });
});
