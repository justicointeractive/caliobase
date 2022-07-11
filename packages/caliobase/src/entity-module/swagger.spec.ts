import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { createTestingModule } from '../test/createTestingModule';
import { createEntityModule } from './createEntityModule';
import { CaliobaseEntity, RelationController } from './decorators';

describe('swagger', () => {
  it('should generate swagger file', async () => {
    @CaliobaseEntity({
      controller: { name: 'card' },
    })
    class Card {
      @PrimaryGeneratedColumn('uuid')
      id!: string;

      @RelationController()
      @OneToMany(() => Note, (n) => n.card)
      notes!: Note[];
    }

    @Entity()
    class Note {
      @PrimaryGeneratedColumn('uuid')
      id!: string;

      @Column()
      text!: string;

      @ManyToOne(() => Card)
      card!: Card;
    }

    const entityModule = createEntityModule(Card);

    const module = await createTestingModule({
      imports: [entityModule],
    });

    const config = new DocumentBuilder()
      .setTitle('example')
      .setDescription('The example app API description')
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Bearer',
        name: 'JWT',
        description: 'Access Token',
        in: 'header',
      })
      .build();

    const app = module.createNestApplication();

    const document = SwaggerModule.createDocument(app, config);

    expect(document.paths['/card'].get).not.toBeNull();
    expect(document.paths['/card'].get?.operationId).toEqual(
      'CardController_findAll'
    );
    expect(document.paths['/card/{cardId}/notes'].get?.operationId).toEqual(
      'CardNoteRelationController_findAllNote'
    );
    expect(
      document.paths['/card/{cardId}/notes/{id}'].get?.operationId
    ).toEqual('CardNoteRelationController_findOneNote');
  });
});
