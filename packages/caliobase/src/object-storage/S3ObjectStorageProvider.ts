import { PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  AbstractObjectStorageProvider,
  DeleteResult,
  ObjectUploadRequest,
  SignedUploadUrl,
} from './AbstractObjectStorageProvider';

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

  async createSignedUploadUrl(
    file: ObjectUploadRequest
  ): Promise<SignedUploadUrl> {
    const command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: `${this.options.keyPrefix}${file.key}`,
      ContentType: file.contentType,
      ContentLength: file.contentLength,
    });

    const result = await getSignedUrl(this.s3, command, { expiresIn: 15 * 60 });

    return { url: result, method: 'PUT' };
  }

  async deleteFile(path: string): Promise<DeleteResult> {
    await this.s3.deleteObject({
      Bucket: this.options.bucket,
      Key: `${this.options.keyPrefix}${path}`,
    });
    return { deleted: true };
  }
}