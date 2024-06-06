import { URL } from 'url';
import {
  createTestOrganization,
  createTestingModule,
  useTestingModule,
} from '../test/createTestingModule';
import { AbstractObjectStorageProvider } from './AbstractObjectStorageProvider';
import {
  ObjectCreateFromUrlRequest,
  ObjectStorageService,
} from './object-storage.service';

describe('object storage', () => {
  it('should initialize caliobase module with an object storage provider', async () => {
    const module = await createTestingModule({ objectStorage: false });
    expect(module).toBeTruthy();
  });
  it('should initialize caliobase module without an object storage provider', async () => {
    const module = await createTestingModule({ objectStorage: true });
    expect(module).toBeTruthy();
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
      source: new URL('https://google.com'),
      fileName: randomFileName,
      organization,
      uploadedBy: owner.user,
      date: new Date(0),
    };
    await objectStorageService.uploadFileFromUrl(request);

    expect(
      await objectStorage.fileExists(
        objectStorageService.getKeyForFile(request)
      )
    ).toEqual(true);
  });
});
