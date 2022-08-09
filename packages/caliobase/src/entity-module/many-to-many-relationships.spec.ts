import { faker } from '@faker-js/faker';
import { omit } from 'lodash';
import { Column, JoinTable, ManyToMany } from 'typeorm';
import { createEntityModule, ICaliobaseController } from '.';
import { assert } from '../lib/assert';
import { createSwaggerDocument } from '../test/createSwaggerDocument';
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
import { IManyToManyRelationController } from './IManyToManyRelationController';

describe('many to many relationships', () => {
  @CaliobaseEntity({
    entity: { name: 'many_to_many_card' },
    controller: { name: 'card' },
  })
  class Card {
    @PrimaryGeneratedPrefixedNanoIdColumn('card')
    id!: string;

    @Column()
    title!: string;

    @RelationController()
    @ManyToMany(() => Tag, { eager: true })
    @JoinTable()
    tags!: Tag[];
  }

  @CaliobaseEntity({
    entity: { name: 'many_to_many_tag' },
    controller: { name: 'tag' },
  })
  class Tag {
    @PrimaryGeneratedPrefixedNanoIdColumn('tag')
    id!: string;

    @Column()
    title!: string;
  }

  const { cardController, tagController, cardTagController, owner, module } =
    useTestingModule(async () => {
      const cardModule = createEntityModule(Card);
      const tagModule = createEntityModule(Tag);

      const module = await createTestingModule({
        imports: [cardModule, tagModule],
      });

      const cardControllerType = cardModule.EntityControllers?.find(
        (c) => c.name === 'CardController'
      );
      assert(cardControllerType);
      const cardController = module.get(
        cardControllerType
      ) as ICaliobaseController<Card>;
      assert(cardController);

      const tagControllerType = tagModule.EntityControllers?.find(
        (c) => c.name === 'TagController'
      );
      assert(tagControllerType);
      const tagController = module.get(
        tagControllerType
      ) as ICaliobaseController<Card>;
      assert(tagController);

      const cardTagControllerType = cardModule.EntityControllers?.find(
        (c) => c.name === 'CardTagRelationController'
      );
      assert(cardTagControllerType);
      const cardTagController = module.get(
        cardTagControllerType
      ) as IManyToManyRelationController<{
        manyToManyTagId: string;
        manyToManyCardId: string;
      }>;
      assert(cardTagController);

      const createOrganization = await createTestOrganization(module);

      return {
        module,
        cardModule,
        tagModule,
        cardController,
        tagController,
        cardTagController,
        ...createOrganization,
      };
    });

  it('should create relation controller', async () => {
    expect(cardTagController).not.toBeNull();
  });

  it('should create related content', async () => {
    const { item: card } = await cardController.create(
      { title: faker.commerce.product() },
      {},
      { user: owner }
    );

    const { item: tag } = await tagController.create(
      {
        title: faker.lorem.word(),
      },
      {},
      { user: owner }
    );

    await cardTagController.create(
      { manyToManyTagId: tag.id, manyToManyCardId: card.id },
      {
        user: owner,
      }
    );

    expect(tag).not.toBeNull();

    expect(
      (await tagController.findOne(tag, { user: owner })).item
    ).toMatchObject(omit(tag, ['organization']));

    expect(
      (await cardController.findOne(card, { user: owner })).item?.tags
    ).toHaveLength(1);

    await cardTagController.remove(
      { manyToManyTagId: tag.id, manyToManyCardId: card.id },
      {
        user: owner,
      }
    );

    expect(
      (await cardController.findOne(card, { user: owner })).item?.tags
    ).toHaveLength(0);

    expect(tag).not.toBeNull();
  });

  it('should create swagger definition', () => {
    const document = createSwaggerDocument(module);
    expect(
      document.paths['/card/{manyToManyCardId}/tags/{manyToManyTagId}'].post
    ).toBeTruthy();
    expect(
      document.paths['/card/{manyToManyCardId}/tags/{manyToManyTagId}'].delete
    ).toBeTruthy();
  });
});
