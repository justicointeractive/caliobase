import { PutObjectCommand, S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  AbstractObjectStorageProvider,
  DeleteResult,
  ObjectUploadRequest,
  SignedUploadUrl,
} from './AbstractFileProvider';

const s3 = new S3({});

export class S3ObjectStorageProvider extends AbstractObjectStorageProvider {
  constructor(private options: { bucket: string; prefix: string }) {
    super();
  }

  async createSignedUploadUrl(
    file: ObjectUploadRequest
  ): Promise<SignedUploadUrl> {
    const command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: `${this.options.prefix}${file.key}`,
      ContentType: file.contentType,
      ContentLength: file.contentLength,
    });

    const result = await getSignedUrl(s3, command, { expiresIn: 15 * 60 });

    return { signedUrl: result };
  }

  async deleteFile(path: string): Promise<DeleteResult> {
    await s3.deleteObject({
      Bucket: this.options.bucket,
      Key: `${this.options.prefix}${path}`,
    });
    return { deleted: true };
  }
}
