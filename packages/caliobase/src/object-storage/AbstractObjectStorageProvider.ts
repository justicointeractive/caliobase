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

export class SignedUploadUrlResult {
  @ApiProperty()
  part!: number;

  @ApiProperty()
  etag!: string;
}

export class CompleteUploadRequest {
  @ApiProperty()
  uploadId!: string;

  @ApiProperty()
  parts!: SignedUploadUrlResult[];
}

export type ObjectStorageProviderOptions = {
  cdnUrlPrefix: string;
};

export abstract class AbstractObjectStorageProvider {
  constructor(
    public readonly options: Readonly<ObjectStorageProviderOptions>
  ) {}

  abstract createUpload(
    object: ObjectStorageObject
  ): Promise<SignedUploadUrl[]>;

  abstract completeUpload(
    object: ObjectStorageObject,
    completion: CompleteUploadRequest
  ): Promise<void>;

  abstract deleteFile(file: string): Promise<DeleteResult>;
}
