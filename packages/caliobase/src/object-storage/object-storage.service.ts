import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
import { DataSource } from 'typeorm';
import { URL } from 'url';
import {
  storageError,
  validateOperationOptions,
  withRequest,
} from './operation';
import {
  AbstractObjectStorageProvider,
  CompleteUploadRequest,
  ObjectStorageObject,
  ObjectStorageOperationOptions,
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
} & ObjectStorageOperationOptions &
  Omit<ObjectCreateRequest, 'contentLength' | 'contentType'>;

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

  async createObject(
    file: ObjectCreateRequest,
    options: ObjectStorageOperationOptions = {}
  ) {
    validateOperationOptions(options);
    options.signal?.throwIfAborted();
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

    try {
      options.signal?.throwIfAborted();
      const upload = await this.objectStorageProvider.createUpload(
        object,
        options
      );
      return { object, upload };
    } catch (error) {
      throw storageError(error, { objectId: object.id, key: object.key });
    }
  }

  async completeUpload(
    objectId: string,
    completion: CompleteUploadRequest,
    options: ObjectStorageOperationOptions = {}
  ) {
    validateOperationOptions(options);
    options.signal?.throwIfAborted();
    const object = await this.objectRepo.findOneOrFail({
      where: { id: objectId },
    });

    options.signal?.throwIfAborted();
    await this.objectStorageProvider.completeUpload(
      object,
      completion,
      options
    );
    try {
      options.signal?.throwIfAborted();
      object.status = 'ready';
      return await this.objectRepo.save(object);
    } catch (error) {
      throw storageError(error, {
        objectId: object.id,
        key: object.key,
        committed: true,
      });
    }
  }

  async refreshUploadUrls(
    objectId: string,
    request: RefreshSignedUrlsRequest,
    options: ObjectStorageOperationOptions = {}
  ): Promise<SignedUploadUrl[]> {
    validateOperationOptions(options);
    options.signal?.throwIfAborted();
    const object = await this.objectRepo.findOneOrFail({
      where: { id: objectId },
    });
    options.signal?.throwIfAborted();
    return await this.objectStorageProvider.refreshSignedUrls(
      object,
      request,
      options
    );
  }

  async urlOrFileToFile(
    sourceUrlOrBuffer: URL | File,
    options: ObjectStorageOperationOptions = {}
  ): Promise<File> {
    validateOperationOptions(options);
    options.signal?.throwIfAborted();
    if (sourceUrlOrBuffer instanceof File) {
      return sourceUrlOrBuffer;
    }
    return withRequest(options, async (signal) => {
      const response = await fetch(sourceUrlOrBuffer, { signal });
      try {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${sourceUrlOrBuffer}: ${response.status} ${response.statusText}`
          );
        }
        const contentType = response.headers.get('content-type') ?? '';
        const buffer = await response.arrayBuffer();
        return new File([buffer], '', { type: contentType });
      } finally {
        if (response.body && !response.body.locked) {
          await response.body.cancel();
        }
      }
    });
  }

  async uploadFileFromUrl(file: ObjectCreateFromUrlRequest) {
    const options = {
      signal: file.signal,
      requestTimeoutMs: file.requestTimeoutMs,
    };
    const buffer = await this.urlOrFileToFile(file.source, options);
    const { object, upload } = await this.createObject(
      { ...file, contentLength: buffer.size, contentType: buffer.type },
      options
    );
    try {
      const uploadedParts: SignedUploadUrlResult[] = [];
      for (const part of upload.parts) {
        await withRequest(options, async (signal) => {
          const response = await fetch(part.url, {
            method: part.method,
            body: buffer.slice(part.rangeStart, part.rangeEnd),
            signal,
          });
          try {
            if (!response.ok) {
              throw new Error(
                `Failed to upload part ${part.part}: ${response.status} ${response.statusText}`
              );
            }
            uploadedParts.push({
              part: part.part,
              etag: response.headers.get('etag') ?? '',
            });
          } finally {
            if (response.body && !response.body.locked) {
              await response.body.cancel();
            }
          }
        });
      }
      await this.completeUpload(
        object.id,
        { uploadId: upload.uploadId, parts: uploadedParts },
        options
      );
      return object;
    } catch (cause) {
      const error = storageError(cause, {
        objectId: object.id,
        key: object.key,
        uploadId: upload.uploadId,
      });
      try {
        if (!error.objectStorage?.committed) {
          await this.objectStorageProvider.abortUpload?.(
            object,
            upload.uploadId,
            { requestTimeoutMs: options.requestTimeoutMs ?? 30_000 }
          );
        }
      } catch (cleanupError) {
        error.cleanupError = cleanupError;
      }
      // Keep pending metadata for reconciliation of ambiguous remote outcomes.
      throw error;
    }
  }
}
