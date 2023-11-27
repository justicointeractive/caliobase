import { faker } from '@faker-js/faker';
import { omit } from 'lodash';
import { Column, ManyToOne, OneToMany } from 'typeorm';
import { createEntityModule, ICaliobaseController } from '.';
import { assert } from '../lib/assert';
import {
  createTestingModule,
  createTestOrganization,
  useTestingModule,
} from '../test/createTestingModule';
import {
  CaliobaseEntity,
  PrimaryGeneratedPrefixedNanoIdColumn,
  RelationController,
} from './decorators';
import { IOneToManyRelationController } from './IOneToManyRelationController';

describe('one to many relationships', () => {
  @CaliobaseEntity({
    entity: { name: 'one_to_many_card' },
    controller: { name: 'card' },
  })
  class Card {
    @PrimaryGeneratedPrefixedNanoIdColumn('card')
    id!: string;

    @Column()
    title!: string;

    @RelationController()
    @OneToMany(() => Note, (n) => n.card, { eager: true })
    notes!: Note[];
  }

  @CaliobaseEntity({
    entity: { name: 'one_to_many_card_note' },
    controller: { name: 'note' },
  })
  class Note {
    @PrimaryGeneratedPrefixedNanoIdColumn('note')
    id!: string;

    @Column()
    text!: string;

    @Column()
    cardId!: string;

    @ManyToOne(() => Card)
    card!: Card;
  }

  const { cardController, cardNoteController, noteController, owner } =
    useTestingModule(async () => {
      const cardEntityModule = createEntityModule(Card);
      const noteEntityModule = createEntityModule(Note);

      const module = await createTestingModule({
        imports: [cardEntityModule, noteEntityModule],
      });

      const cardControllerType = cardEntityModule.EntityControllers?.find(
        (c) => c.name === 'CardController'
      );
      assert(cardControllerType);
      const cardController = module.get(
        cardControllerType
      ) as ICaliobaseController<Card>;
      assert(cardController);

      const cardNoteControllerType = cardEntityModule.EntityControllers?.find(
        (c) => c.name === 'CardNoteRelationController'
      );
      assert(cardNoteControllerType);
      const cardNoteController = module.get(
        cardNoteControllerType
      ) as IOneToManyRelationController<Note>;
      assert(cardNoteController);

      const noteControllerType = noteEntityModule.EntityControllers?.find(
        (c) => c.name === 'NoteController'
      );
      assert(noteControllerType);
      const noteController = module.get(
        noteControllerType
      ) as ICaliobaseController<Note>;
      assert(noteController);

      const createOrganization = await createTestOrganization(module);

      return {
        module,
        cardEntityModule,
        noteEntityModule,
        cardController,
        cardNoteController,
        noteController,
        ...createOrganization,
      };
    });

  it('should create relation controller', async () => {
    expect(cardNoteController).not.toBeNull();
  });

  it('should create related content', async () => {
    const { item: card } = await cardController.create(
      { title: faker.commerce.product() },
      {},
      { user: owner }
    );

    const { item: note } = await cardNoteController.create(
      {
        text: faker.lorem.sentence(),
      },
      { card },
      { user: owner }
    );

    expect(note).not.toBeNull();

    expect(
      (await cardNoteController.findOne(note, { user: owner })).item
    ).toMatchObject({
      ...omit(note, ['card', 'organization']),
    });

    expect(
      (await noteController.findOne(note, null, { user: owner })).item
    ).toMatchObject(omit(note, ['card', 'organization']));

    expect(
      (await cardController.findOne(card, null, { user: owner })).item?.notes
    ).toHaveLength(1);

    expect(note).not.toBeNull();
  });
});
