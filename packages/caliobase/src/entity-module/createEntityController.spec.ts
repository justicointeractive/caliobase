import { Get, Inject, Injectable } from '@nestjs/common';
import { PrimaryColumn } from 'typeorm';
import { createEntityModule } from '..';
import { createTestingModule } from '../test/createTestingModule';
import { CaliobaseEntity } from './decorators';

describe('createEntityController', () => {
  it('should extend controller', async () => {
    @Injectable()
    class InjectableService {}

    @CaliobaseEntity({
      controller: {
        name: 'foo',
        extend(BaseClass, ServiceClass) {
          class ExtendedClass extends BaseClass {
            constructor(
              @Inject(InjectableService)
              public injectableService: InjectableService,
              @Inject(ServiceClass) service: InstanceType<typeof ServiceClass>
            ) {
              super(service);
            }
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

    const entityModule = createEntityModule(FooEntity, undefined, [
      InjectableService,
    ]);

    const module = await createTestingModule({
      imports: [entityModule],
    });

    const controller = module.get<any>(entityModule.EntityControllers![0]);

    expect(controller).toHaveProperty('newEndpoint');
    expect(controller.injectableService).toBeInstanceOf(InjectableService);
    expect(controller.service).toBeInstanceOf(entityModule.EntityService);
  });
});
