import { Get, Inject, Injectable, Module } from '@nestjs/common';
import { PrimaryColumn } from 'typeorm';
import { createEntityModule } from '..';
import { createTestingModule } from '../test/createTestingModule';
import { CaliobaseEntity } from './decorators';

describe('createEntityController', () => {
  it('should extend controller', async () => {
    @Injectable()
    class InjectableService {}

    @Module({
      providers: [InjectableService],
      exports: [InjectableService],
    })
    class InjectableModule {}

    @CaliobaseEntity({
      imports: [InjectableModule],
      controller: {
        name: 'foo',
        extend(BaseClass, ServiceClass) {
          class ExtendedClass extends BaseClass {
            constructor(
              public injectable: InjectableService,
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

    const entityModule = createEntityModule(FooEntity);

    const module = await createTestingModule({
      imports: [InjectableModule, entityModule],
    });

    const controller = module.get<any>(entityModule.EntityControllers![0]);

    expect(controller).toHaveProperty('newEndpoint');
    expect(controller.injectable).toBeInstanceOf(InjectableService);
    expect(controller.service).toBeInstanceOf(entityModule.EntityService);
  });
});
