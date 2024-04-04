import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  S3,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { parse as bytes } from 'bytes';
import { assert } from '../lib/assert';
import {
  AbstractObjectStorageProvider,
  CompleteUploadRequest,
  DeleteResult,
  SignedUploadUrl,
  Upload,
} from './AbstractObjectStorageProvider';
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

  async createUpload(object: ObjectStorageObject): Promise<Upload> {
    const chunkSize = bytes('100MB');

    const desiredParts = Math.ceil(object.contentLength / chunkSize);

    const parts: SignedUploadUrl[] = [];

    const { UploadId: uploadId } = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.options.bucket,
        Key: `${this.options.keyPrefix}${object.key}`,
        ContentType: object.contentType,
      })
    );

    assert(uploadId);

    for (let i = 0; i < desiredParts; i++) {
      const start = i * chunkSize;
      const end = Math.min(object.contentLength, (i + 1) * chunkSize);

      const command = new UploadPartCommand({
        Bucket: this.options.bucket,
        Key: `${this.options.keyPrefix}${object.key}`,
        UploadId: uploadId,
        PartNumber: i + 1,
        ContentLength: end - start,
      });

      const url = await getSignedUrl(this.s3, command, { expiresIn: 15 * 60 });

      parts.push({
        method: 'PUT',
        part: i + 1,
        rangeStart: start,
        rangeEnd: end,
        url,
      });
    }

    return {
      uploadId,
      parts,
    };
  }

  async completeUpload(
    object: ObjectStorageObject,
    completion: CompleteUploadRequest
  ): Promise<void> {
    await this.s3.send(
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
      })
    );
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
