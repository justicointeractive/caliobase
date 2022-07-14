import { Get } from '@nestjs/common';
import { PrimaryColumn } from 'typeorm';
import { createEntityModule } from '..';
import { createTestingModule } from '../test/createTestingModule';
import { CaliobaseEntity } from './decorators';

describe('createEntityController', () => {
  it('should extend controller', async () => {
    @CaliobaseEntity({
      controller: {
        name: 'foo',
        extend(controllerClass) {
          class ExtendedClass extends controllerClass {
            @Get()
            newEndpoint() {
              return {};
            }
          }
          return ExtendedClass;
        },
      },
    })
    class FooEntity {
      @PrimaryColumn()
      id!: string;
    }

    const entityModule = createEntityModule(FooEntity);

    const module = await createTestingModule({
      imports: [entityModule],
    });

    const controller = module.get(entityModule.EntityControllers![0]);

    expect(controller).toHaveProperty('newEndpoint');
  });
});
