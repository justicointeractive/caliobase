import { ApiProperty } from '@nestjs/swagger';
import { ObjectStorageObject } from './object-storage-object.entity';

export type DeleteResult = {
  deleted: boolean;
};

export class SignedUploadUrl {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  method!: string;

  @ApiProperty()
  rangeStart!: number;

  @ApiProperty()
  rangeEnd!: number;

  @ApiProperty()
  part!: number;
}

export class Upload {
  @ApiProperty()
  uploadId!: string;

  @ApiProperty({ type: [SignedUploadUrl] })
  parts!: SignedUploadUrl[];
}

export class SignedUploadUrlResult {
  @ApiProperty()
  part!: number;

  @ApiProperty()
  etag!: string;
}

export class CompleteUploadRequest {
  @ApiProperty()
  uploadId!: string;

  @ApiProperty({ type: [SignedUploadUrlResult] })
  parts!: SignedUploadUrlResult[];
}

export class RefreshSignedUrlsRequest {
  @ApiProperty()
  uploadId!: string;

  @ApiProperty({ type: [Number] })
  parts!: number[];
}

export type ObjectStorageProviderOptions = {
  cdnUrlPrefix: string;
};

/** Optional cancellation and per-request deadline. Existing callers need no options. */
export type ObjectStorageOperationOptions = {
  signal?: AbortSignal;
  /** Positive integer milliseconds. Covers response-body consumption as well. */
  requestTimeoutMs?: number;
};

export abstract class AbstractObjectStorageProvider {
  constructor(
    public readonly options: Readonly<ObjectStorageProviderOptions>
  ) {}

  abstract createUpload(
    object: ObjectStorageObject,
    options?: ObjectStorageOperationOptions
  ): Promise<Upload>;

  abstract refreshSignedUrls(
    object: ObjectStorageObject,
    request: RefreshSignedUrlsRequest,
    options?: ObjectStorageOperationOptions
  ): Promise<SignedUploadUrl[]>;

  abstract completeUpload(
    object: ObjectStorageObject,
    completion: CompleteUploadRequest,
    options?: ObjectStorageOperationOptions
  ): Promise<void>;

  /** Optional for compatibility with custom providers that do not use multipart uploads. */
  abortUpload?(
    object: ObjectStorageObject,
    uploadId: string,
    options?: ObjectStorageOperationOptions
  ): Promise<void>;

  abstract deleteFile(file: string): Promise<DeleteResult>;

  abstract fileExists(file: string): Promise<boolean>;
}
