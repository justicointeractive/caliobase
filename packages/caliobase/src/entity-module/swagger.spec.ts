import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { createSwaggerDocument } from '../test/createSwaggerDocument';
import { createTestingModule } from '../test/createTestingModule';
import { createEntityModule } from './createEntityModule';
import {
  CaliobaseEntity,
  PrimaryGeneratedPrefixedNanoIdColumn,
  RelationController,
} from './decorators';

describe('swagger', () => {
  it('should generate swagger file', async () => {
    @CaliobaseEntity({
      controller: { name: 'person' },
    })
    class Person {
      @PrimaryGeneratedPrefixedNanoIdColumn('person')
      id!: string;

      @RelationController()
      @OneToMany(() => Note, (n) => n.person)
      notes!: Note[];
    }

    @CaliobaseEntity({
      controller: { name: 'person_profile' },
    })
    class PersonProfile {
      @PrimaryColumn()
      id!: string;

      @OneToOne(() => Person)
      @JoinColumn({})
      person!: Person;
    }

    @Entity()
    class Note {
      @PrimaryGeneratedPrefixedNanoIdColumn('note')
      id!: string;

      @Column()
      text!: string;

      @ManyToOne(() => Person)
      person!: Person;
    }

    const entityModule = createEntityModule(Person);
    const profileModule = createEntityModule(PersonProfile);

    const module = await createTestingModule({
      imports: [entityModule, profileModule],
    });

    const document = createSwaggerDocument(module);

    expect(document.paths['/root'].get).toBeTruthy();
    expect(document.paths['/root'].post).toBeTruthy();
    expect(document.paths['/person'].post).toBeTruthy();
    expect(document.paths['/person/{id}'].post).toBeFalsy();
    expect(document.paths['/person'].get).toBeTruthy();
    expect(document.paths['/person'].get?.operationId).toEqual(
      'PersonController_findAll'
    );
    expect(
      document.paths['/person'].get?.parameters?.find(
        (param) => 'name' in param && param.name === 'limit'
      )
    ).toBeTruthy();
    expect(
      document.paths['/person'].get?.parameters?.find(
        (param) => 'name' in param && param.name === 'skip'
      )
    ).toBeTruthy();

    expect(document.paths['/person_profile'].post).toBeFalsy();
    expect(document.paths['/person_profile/{id}'].post).toBeTruthy();

    expect(document.paths['/person/{personId}/notes'].get?.operationId).toEqual(
      'PersonNoteRelationController_findAllNote'
    );
    expect(
      document.paths['/person/{personId}/notes/{id}'].get?.operationId
    ).toEqual('PersonNoteRelationController_findOneNote');
  });
});
