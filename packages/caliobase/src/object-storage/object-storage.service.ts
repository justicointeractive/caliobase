import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { DataSource } from 'typeorm';
import {
  AbstractObjectStorageProvider,
  CompleteUploadRequest,
  ObjectStorageObject,
} from '.';

export type ObjectCreateRequest = {
  contentLength: number;
  contentType: string;
  fileName: string;
  organization: { id: string };
  uploadedBy: { id: string };
};

@Injectable()
export class ObjectStorageService {
  objectRepo = this.dataSource.getRepository(ObjectStorageObject);

  constructor(
    private dataSource: DataSource,
    private objectStorage: AbstractObjectStorageProvider
  ) {}

  async createObject(file: ObjectCreateRequest) {
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

    const upload = await this.objectStorage.createUpload(object);

    return { object, upload };
  }

  async completeUpload(objectId: string, completion: CompleteUploadRequest) {
    const object = await this.objectRepo.findOneOrFail({
      where: { id: objectId },
    });

    await this.objectStorage.completeUpload(object, completion);

    object.status = 'ready';

    return await this.objectRepo.save(object);
  }
}
