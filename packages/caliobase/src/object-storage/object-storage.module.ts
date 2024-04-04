import { DynamicModule, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbstractObjectStorageProvider } from './AbstractObjectStorageProvider';
import { ObjectStorageObject } from './object-storage-object.entity';
import { ObjectStorageController } from './object-storage.controller';
import { ObjectStorageService } from './object-storage.service';

export type CaliobaseObjectStorageModuleOptions = {
  objectStorageProvider: AbstractObjectStorageProvider;
};

const builtInEntities = [ObjectStorageObject];

@Global() // TODO: may regret making this global?
@Module({})
export class CaliobaseObjectStorageModule {
  static async forRootAsync({
    objectStorageProvider,
  }: CaliobaseObjectStorageModuleOptions): Promise<DynamicModule> {
    return {
      module: CaliobaseObjectStorageModule,
      imports: [TypeOrmModule.forFeature([...builtInEntities])],
      providers: [
        {
          provide: AbstractObjectStorageProvider,
          useValue: objectStorageProvider,
        },
        ObjectStorageService,
      ],
      controllers: [ObjectStorageController],
      exports: [ObjectStorageService],
    };
  }
}
