import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { DataSource } from 'typeorm';
import { URL } from 'url';
import {
  AbstractObjectStorageProvider,
  CompleteUploadRequest,
  ObjectStorageObject,
  RefreshSignedUrlsRequest,
  SignedUploadUrl,
  SignedUploadUrlResult,
} from '.';

export type ObjectCreateRequest = {
  contentLength: number;
  contentType: string;
  fileName: string;
  /**
   * Organization that owns the file.
   */
  organization: { id: string };
  /**
   * User who uploaded the file.
   */
  uploadedBy?: { id: string };
  /**
   * Date used in the object key.
   * @default new Date()
   * */
  date?: Date;
  /**
   * External ID for the object.
   */
  externalId?: string;
};

export type ObjectCreateFromUrlRequest = {
  source: URL | File;
} & Omit<ObjectCreateRequest, 'contentLength' | 'contentType'>;

@Injectable()
export class ObjectStorageService {
  objectRepo = this.dataSource.getRepository(ObjectStorageObject);

  constructor(
    private dataSource: DataSource,
    private objectStorageProvider: AbstractObjectStorageProvider
  ) {}

  getKeyForFile({
    organization,
    date = new Date(),
    fileName,
  }: Pick<ObjectCreateRequest, 'organization' | 'date' | 'fileName'>) {
    return `${organization.id}/${format(date, 'yyyy/MM/dd')}/${fileName}`;
  }

  async createObject(file: ObjectCreateRequest) {
    const { contentLength, contentType, organization, uploadedBy } = file;

    const key = this.getKeyForFile(file);

    const cdnUrl = `${this.objectStorageProvider.options.cdnUrlPrefix}${key}`;

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

    const upload = await this.objectStorageProvider.createUpload(object);

    return { object, upload };
  }

  async completeUpload(objectId: string, completion: CompleteUploadRequest) {
    const object = await this.objectRepo.findOneOrFail({
      where: { id: objectId },
    });

    await this.objectStorageProvider.completeUpload(object, completion);

    object.status = 'ready';

    return await this.objectRepo.save(object);
  }

  async refreshUploadUrls(
    objectId: string,
    request: RefreshSignedUrlsRequest
  ): Promise<SignedUploadUrl[]> {
    const object = await this.objectRepo.findOneOrFail({
      where: { id: objectId },
    });

    return await this.objectStorageProvider.refreshSignedUrls(object, request);
  }

  async urlOrFileToFile(sourceUrlOrBuffer: URL | File): Promise<File> {
    if (sourceUrlOrBuffer instanceof File) {
      return sourceUrlOrBuffer;
    }

    const response = await fetch(sourceUrlOrBuffer);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${sourceUrlOrBuffer}: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get('content-type') ?? '';

    const buffer = await response.arrayBuffer();

    const file = new File([buffer], '', { type: contentType });

    return file;
  }

  async uploadFileFromUrl(file: ObjectCreateFromUrlRequest) {
    const buffer = await this.urlOrFileToFile(file.source);

    const { object, upload } = await this.createObject({
      ...file,
      contentLength: buffer.size,
      contentType: buffer.type,
    });

    const uploadedParts: SignedUploadUrlResult[] = [];
    for (const part of upload.parts) {
      const resp = await fetch(part.url, {
        method: part.method,
        body: buffer.slice(part.rangeStart, part.rangeEnd),
      });

      if (!resp.ok) {
        throw new Error(
          `Failed to upload part ${part.part}: ${resp.status} ${resp.statusText}`
        );
      }

      uploadedParts.push({
        part: part.part,
        etag: resp.headers.get('etag') ?? '',
      });
    }

    await this.completeUpload(object.id, {
      uploadId: upload.uploadId,
      parts: uploadedParts,
    });

    return object;
  }
}
