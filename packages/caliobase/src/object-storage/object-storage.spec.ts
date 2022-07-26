import { createTestingModule } from '../test/createTestingModule';

describe('object storage', () => {
  it('should initialize caliobase module with an object storage provider', async () => {
    const module = await createTestingModule({ objectStorage: false });
    expect(module).toBeTruthy();
  });
  it('should initialize caliobase module without an object storage provider', async () => {
    const module = await createTestingModule({ objectStorage: true });
    expect(module).toBeTruthy();
  });
});
