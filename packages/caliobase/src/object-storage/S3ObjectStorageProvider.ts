import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import type { AbortSignal as SdkAbortSignal } from '@aws-sdk/types';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { parse as bytes } from 'bytes';
import { assert } from '../lib/assert';
import {
  AbstractObjectStorageProvider,
  CompleteUploadRequest,
  DeleteResult,
  ObjectStorageOperationOptions,
  RefreshSignedUrlsRequest,
  SignedUploadUrl,
  Upload,
} from './AbstractObjectStorageProvider';
import { storageError, withRequest } from './operation';
import { ObjectStorageObject } from './object-storage-object.entity';

export type S3ObjectStorageProviderOptions = {
  cdnUrlPrefix: string;
  bucket: string;
  keyPrefix: string;
  endpoint?: string;
};

export class S3ObjectStorageProvider extends AbstractObjectStorageProvider {
  s3 = new S3({
    endpoint: this.options.endpoint,
  });

  constructor(
    public override readonly options: Readonly<S3ObjectStorageProviderOptions>
  ) {
    super(options);
  }

  private readonly chunkSize = bytes('100MB');

  private getPartRange(
    partNumber: number,
    contentLength: number
  ): { start: number; end: number } {
    const start = (partNumber - 1) * this.chunkSize;
    const end = Math.min(contentLength, partNumber * this.chunkSize);
    return { start, end };
  }

  private async createSignedPartUrl(
    object: ObjectStorageObject,
    uploadId: string,
    partNumber: number
  ): Promise<SignedUploadUrl> {
    const { start, end } = this.getPartRange(partNumber, object.contentLength);

    const command = new UploadPartCommand({
      Bucket: this.options.bucket,
      Key: `${this.options.keyPrefix}${object.key}`,
      UploadId: uploadId,
      PartNumber: partNumber,
      ContentLength: end - start,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 15 * 60 });

    return {
      method: 'PUT',
      part: partNumber,
      rangeStart: start,
      rangeEnd: end,
      url,
    };
  }

  async createUpload(
    object: ObjectStorageObject,
    options: ObjectStorageOperationOptions = {}
  ): Promise<Upload> {
    const totalParts = Math.ceil(object.contentLength / this.chunkSize);
    let uploadId: string | undefined;
    try {
      await withRequest(options, async (signal) => {
        const result = await this.s3.send(
          new CreateMultipartUploadCommand({
            Bucket: this.options.bucket,
            Key: `${this.options.keyPrefix}${object.key}`,
            ContentType: object.contentType,
          }),
          { abortSignal: signal as SdkAbortSignal }
        );
        uploadId = result.UploadId;
      });
      assert(uploadId);
      const knownUploadId = uploadId;
      const parts: SignedUploadUrl[] = [];
      for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
        // The presigner/credential provider cannot be cancelled. Join it, then
        // check cancellation before exposing signed URLs or starting more work.
        parts.push(
          await withRequest(options, () =>
            this.createSignedPartUrl(object, knownUploadId, partNumber)
          )
        );
      }
      return { uploadId, parts };
    } catch (cause) {
      const error = storageError(cause, {
        objectId: object.id,
        key: object.key,
        uploadId,
      });
      if (uploadId) {
        try {
          await this.abortUpload(object, uploadId, {
            requestTimeoutMs: options.requestTimeoutMs ?? 30_000,
          });
        } catch (cleanupError) {
          error.cleanupError = cleanupError;
        }
      }
      throw error;
    }
  }

  async refreshSignedUrls(
    object: ObjectStorageObject,
    request: RefreshSignedUrlsRequest,
    options: ObjectStorageOperationOptions = {}
  ): Promise<SignedUploadUrl[]> {
    const refreshedParts: SignedUploadUrl[] = [];

    for (const partNumber of request.parts) {
      refreshedParts.push(
        await withRequest(options, () =>
          this.createSignedPartUrl(object, request.uploadId, partNumber)
        )
      );
    }

    return refreshedParts;
  }

  async completeUpload(
    object: ObjectStorageObject,
    completion: CompleteUploadRequest,
    options: ObjectStorageOperationOptions = {}
  ): Promise<void> {
    await withRequest(
      options,
      (signal) =>
        this.s3.send(
          new CompleteMultipartUploadCommand({
            Bucket: this.options.bucket,
            Key: `${this.options.keyPrefix}${object.key}`,
            UploadId: completion.uploadId,
            MultipartUpload: {
              Parts: completion.parts.map((part) => ({
                PartNumber: part.part,
                ETag: part.etag,
              })),
            },
          }),
          { abortSignal: signal as SdkAbortSignal }
        ),
      false
    ); // A successful remote commit must not be reclassified as uncommitted.
  }

  override async abortUpload(
    object: ObjectStorageObject,
    uploadId: string,
    options: ObjectStorageOperationOptions = {}
  ): Promise<void> {
    try {
      await withRequest(options, (signal) =>
        this.s3.send(
          new AbortMultipartUploadCommand({
            Bucket: this.options.bucket,
            Key: `${this.options.keyPrefix}${object.key}`,
            UploadId: uploadId,
          }),
          { abortSignal: signal as SdkAbortSignal }
        )
      );
    } catch (error) {
      // Completion may have succeeded remotely. Never blindly delete the object.
      if (!(error instanceof Error) || error.name !== 'NoSuchUpload') {
        throw error;
      }
    }
  }

  async deleteFile(path: string): Promise<DeleteResult> {
    await this.s3.deleteObject({
      Bucket: this.options.bucket,
      Key: `${this.options.keyPrefix}${path}`,
    });
    return { deleted: true };
  }

  override async fileExists(path: string): Promise<boolean> {
    try {
      await this.s3.headObject({
        Bucket: this.options.bucket,
        Key: `${this.options.keyPrefix}${path}`,
      });
      return true;
    } catch (e: any) {
      if (e.name === 'NotFound') {
        return false;
      }
      throw e;
    }
  }
}
