import { URL } from 'url';
import {
  createTestOrganization,
  createTestingModule,
  useTestingModule,
} from '../test/createTestingModule';
import { AbstractObjectStorageProvider } from './AbstractObjectStorageProvider';
import { S3ObjectStorageProvider } from './S3ObjectStorageProvider';
import {
  ObjectCreateFromUrlRequest,
  ObjectStorageService,
} from './object-storage.service';

describe('object storage', () => {
  it('should initialize caliobase module with an object storage provider', async () => {
    const module = await createTestingModule({ objectStorage: false });
    try {
      expect(module).toBeTruthy();
    } finally {
      await module.close();
    }
  });
  it('should initialize caliobase module without an object storage provider', async () => {
    const module = await createTestingModule({ objectStorage: true });
    try {
      expect(module).toBeTruthy();
    } finally {
      await module.close();
    }
  });

  const { module, organization, owner } = useTestingModule(async () => {
    const module = await createTestingModule({
      objectStorage: true,
    });

    const { organization, owner } = await createTestOrganization(module);

    return {
      module,
      organization,
      owner,
    };
  });

  const randomFileName = `test-${Math.random().toString(36).substring(7)}`;
  it('should be able to check that an object does not exist', async () => {
    const objectStorage = module.get(AbstractObjectStorageProvider);
    expect(await objectStorage.fileExists(randomFileName)).toEqual(false);
  });
  it('should be able to upload a file from a URL', async () => {
    const objectStorage = module.get(AbstractObjectStorageProvider);
    const objectStorageService = module.get(ObjectStorageService);

    const request: ObjectCreateFromUrlRequest = {
      source: new URL('data:text/plain,object-storage-test'),
      fileName: randomFileName,
      organization,
      uploadedBy: owner.user,
      date: new Date(0),
    };
    const object = await objectStorageService.uploadFileFromUrl(request);
    const provider = objectStorage as S3ObjectStorageProvider;
    try {
      expect(await objectStorage.fileExists(object.key)).toEqual(true);
      const result = await provider.s3.getObject({
        Bucket: provider.options.bucket,
        Key: `${provider.options.keyPrefix}${object.key}`,
      });
      expect(await result.Body?.transformToString()).toEqual(
        'object-storage-test'
      );
    } finally {
      await provider.deleteFile(object.key);
    }
    expect(await objectStorage.fileExists(object.key)).toEqual(false);
  });
  it('aborts a real multipart upload without committing an object', async () => {
    const provider = module.get(
      AbstractObjectStorageProvider
    ) as S3ObjectStorageProvider;
    const storage = module.get(ObjectStorageService);
    const { object, upload } = await storage.createObject({
      fileName: `${randomFileName}-aborted`,
      organization,
      contentLength: 5,
      contentType: 'text/plain',
    });
    try {
      const before = await provider.s3.listMultipartUploads({
        Bucket: provider.options.bucket,
      });
      expect(
        before.Uploads?.some(({ UploadId }) => UploadId === upload.uploadId)
      ).toBe(true);
      await provider.abortUpload(object, upload.uploadId, {
        requestTimeoutMs: 5_000,
      });
      const after = await provider.s3.listMultipartUploads({
        Bucket: provider.options.bucket,
      });
      expect(
        after.Uploads?.some(({ UploadId }) => UploadId === upload.uploadId) ??
          false
      ).toBe(false);
      expect(await provider.fileExists(object.key)).toBe(false);
    } finally {
      await provider.abortUpload(object, upload.uploadId, {
        requestTimeoutMs: 5_000,
      });
    }
  });
});
