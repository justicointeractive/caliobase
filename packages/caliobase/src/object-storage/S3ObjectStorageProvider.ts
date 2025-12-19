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
  RefreshSignedUrlsRequest,
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

  async createUpload(object: ObjectStorageObject): Promise<Upload> {
    const totalParts = Math.ceil(object.contentLength / this.chunkSize);

    const { UploadId: uploadId } = await this.s3.send(
      new CreateMultipartUploadCommand({
        Bucket: this.options.bucket,
        Key: `${this.options.keyPrefix}${object.key}`,
        ContentType: object.contentType,
      })
    );

    assert(uploadId);

    const parts: SignedUploadUrl[] = [];
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      parts.push(await this.createSignedPartUrl(object, uploadId, partNumber));
    }

    return {
      uploadId,
      parts,
    };
  }

  async refreshSignedUrls(
    object: ObjectStorageObject,
    request: RefreshSignedUrlsRequest
  ): Promise<SignedUploadUrl[]> {
    const refreshedParts: SignedUploadUrl[] = [];

    for (const partNumber of request.parts) {
      refreshedParts.push(
        await this.createSignedPartUrl(object, request.uploadId, partNumber)
      );
    }

    return refreshedParts;
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
