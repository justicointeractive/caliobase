import { faker } from '@faker-js/faker';
import { omit } from 'lodash';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { createEntityModule, ICaliobaseController } from '.';
import {
  createTestingModule,
  createTestOrganization,
  useTestingModule,
} from '../test/createTestingModule';
import { CaliobaseEntity, RelationController } from './decorators';
import { IEntityRelationController } from './IEntityRelationController';
import assert = require('assert');

describe('one to many relationships', () => {
  @CaliobaseEntity({
    entity: { name: 'one_to_many_card' },
    controller: { name: 'one' },
  })
  class Card {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    title!: string;

    @RelationController()
    @OneToMany(() => Note, (n) => n.card, { eager: true })
    notes!: Note[];
  }

  @Entity({ name: 'one_to_many_card_note' })
  class Note {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    text!: string;

    @Column()
    cardId!: string;

    @ManyToOne(() => Card)
    card!: Card;
  }

  const { cardController, noteController, owner } = useTestingModule(
    async () => {
      const entityModule = createEntityModule(Card);

      const module = await createTestingModule({
        imports: [entityModule],
      });

      const cardControllerType = entityModule.EntityControllers?.find(
        (c) => c.name === 'CardController'
      );
      assert(cardControllerType);
      const cardController = module.get(
        cardControllerType
      ) as ICaliobaseController<Card>;
      assert(cardController);

      const noteControllerType = entityModule.EntityControllers?.find(
        (c) => c.name === 'CardNoteRelationController'
      );
      assert(noteControllerType);
      const noteController = module.get(
        noteControllerType
      ) as IEntityRelationController<Note>;
      assert(noteController);

      const createOrganization = await createTestOrganization(module);

      return {
        module,
        entityModule,
        cardController,
        noteController,
        ...createOrganization,
      };
    }
  );

  it('should create relation controller', async () => {
    expect(noteController).not.toBeNull();
  });

  it('should create related content', async () => {
    const { item: card } = await cardController.create(
      { title: faker.commerce.product() },
      { user: owner }
    );

    const { item: note } = await noteController.create(
      {
        text: faker.lorem.sentence(),
      },
      { card },
      { user: owner }
    );

    expect(note).not.toBeNull();

    expect(
      (await noteController.findOne(note, { user: owner })).item
    ).toMatchObject(omit(note, ['card']));

    expect(
      (await cardController.findOne(card, { user: owner })).item?.notes
    ).toHaveLength(1);

    expect(note).not.toBeNull();
  });
});
