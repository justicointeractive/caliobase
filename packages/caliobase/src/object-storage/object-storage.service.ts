import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { DataSource } from 'typeorm';
import {
  AbstractObjectStorageProvider,
  ObjectStorageObject,
  ObjectUploadRequest,
} from '.';

@Injectable()
export class ObjectStorageService {
  objectRepo = this.dataSource.getRepository(ObjectStorageObject);

  constructor(
    private dataSource: DataSource,
    private objectStorage: AbstractObjectStorageProvider
  ) {}

  async createObject(
    file: Omit<ObjectUploadRequest, 'key'> & {
      fileName: string;
      organization: { id: string };
      uploadedBy: { id: string };
    }
  ) {
    const { fileName, contentLength, contentType, organization, uploadedBy } =
      file;

    const key = `${organization.id}/${format(
      new Date(),
      'yyyy/MM/dd'
    )}/${fileName}`;

    const cdnUrl = `${this.objectStorage.options.cdnUrlPrefix}${key}`;

    const object = await this.objectRepo.save(
      this.objectRepo.create({
        organization,
        uploadedBy,
        contentLength,
        contentType,
        key,
        cdnUrl,
        status: 'pending',
      })
    );

    const signedUrl = await this.objectStorage.createSignedUploadUrl(object);

    return { object, signedUrl };
  }

  async updateObject(objectId: string, update: Partial<ObjectStorageObject>) {
    const object = await this.objectRepo.findOneOrFail({
      where: { id: objectId },
    });
    Object.assign(object, update);
    return await this.objectRepo.save(object);
  }
}
