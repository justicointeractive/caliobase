export type ObjectUploadRequest = {
  key: string;
  contentLength: number;
  contentType: string;
};

export type DeleteResult = {
  deleted: boolean;
};

export interface SignedUploadUrl {
  signedUrl: string;
}

export abstract class AbstractObjectStorageProvider {
  abstract createSignedUploadUrl(
    file: ObjectUploadRequest
  ): Promise<SignedUploadUrl>;

  abstract deleteFile(file: string): Promise<DeleteResult>;
}
