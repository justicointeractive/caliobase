import { ObjectStorageService } from './object-storage.service';
import { S3ObjectStorageProvider } from './S3ObjectStorageProvider';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const pending = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const waitForAbort = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    });
  });

// All requests and SDK commands are mocked. No credentials or network are used.
describe('cancellable object-storage import', () => {
  const originalFetch = global.fetch;
  let provider: S3ObjectStorageProvider;
  let storage: ObjectStorageService;
  let send: jest.Mock;
  let fetchMock: jest.Mock;
  let savedStatuses: string[];
  let stored: any;
  let repo: any;
  const file = () => ({
    source: new File(['audio'], 'episode.mp3', { type: 'audio/mpeg' }),
    fileName: 'episode.mp3',
    organization: { id: 'org' },
  });

  beforeEach(() => {
    jest.useFakeTimers();
    savedStatuses = [];
    stored = undefined;
    repo = {
      create: jest.fn((value) => ({ id: 'object-id', ...value })),
      save: jest.fn(async (value) => {
        savedStatuses.push(value.status);
        stored = value;
        return value;
      }),
      findOneOrFail: jest.fn(async () => stored),
    };
    provider = new S3ObjectStorageProvider({
      bucket: 'test',
      keyPrefix: '',
      cdnUrlPrefix: 'https://cdn.test/',
    });
    send = jest.fn(async (command) =>
      command instanceof CreateMultipartUploadCommand
        ? { UploadId: 'upload-id' }
        : {}
    );
    provider.s3.send = send;
    (getSignedUrl as jest.Mock)
      .mockReset()
      .mockResolvedValue('https://upload.test/part-1');
    fetchMock = jest
      .fn()
      .mockImplementation(
        async () => new Response('', { headers: { etag: 'etag-1' } })
      );
    global.fetch = fetchMock;
    storage = new ObjectStorageService(
      { getRepository: () => repo } as any,
      provider
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    provider.s3.destroy();
  });

  it('preserves successful callers without options and consumes source bodies', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('audio', { headers: { 'content-type': 'audio/mpeg' } })
    );
    await storage.uploadFileFromUrl({
      ...file(),
      source: new URL('https://feed.test/audio'),
    });
    expect(savedStatuses).toEqual(['pending', 'ready']);
    expect(
      send.mock.calls.map(([command]) => command.constructor.name)
    ).toEqual([
      'CreateMultipartUploadCommand',
      'CompleteMultipartUploadCommand',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the per-request deadline active through source body consumption', async () => {
    let sourceSignal: AbortSignal;
    fetchMock.mockImplementationOnce(async (_, { signal }) => {
      sourceSignal = signal;
      return {
        ok: true,
        headers: new Headers(),
        arrayBuffer: () => waitForAbort(signal),
        body: null,
      };
    });
    const job = new AbortController();
    const result = storage.uploadFileFromUrl({
      ...file(),
      source: new URL('https://feed.test/audio'),
      signal: job.signal,
      requestTimeoutMs: 100,
    });
    const rejected = expect(result).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    await jest.advanceTimersByTimeAsync(100);
    await rejected;
    expect(sourceSignal!.aborted).toBe(true);
    expect(job.signal.aborted).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('aborts multipart creation using its request deadline', async () => {
    let createSignal: AbortSignal;
    send.mockImplementationOnce((_, { abortSignal }) => {
      createSignal = abortSignal;
      return waitForAbort(abortSignal);
    });
    const result = storage.uploadFileFromUrl({
      ...file(),
      requestTimeoutMs: 100,
    });
    const rejected = expect(result).rejects.toMatchObject({
      name: 'TimeoutError',
      objectStorage: { objectId: 'object-id' },
    });
    await jest.advanceTimersByTimeAsync(100);
    await rejected;
    expect(createSignal!.aborted).toBe(true);
    expect(savedStatuses).toEqual(['pending']);
    expect(send).toHaveBeenCalledTimes(1); // no upload ID available for cleanup
  });

  it('awaits part cancellation and independent multipart cleanup before settling', async () => {
    const cleanup = pending<any>();
    let partSignal: AbortSignal;
    let cleanupSignal: AbortSignal;
    fetchMock.mockImplementationOnce((_, { signal }) => {
      partSignal = signal;
      return waitForAbort(signal);
    });
    send.mockImplementation(async (command, { abortSignal }) => {
      if (command instanceof CreateMultipartUploadCommand)
        return { UploadId: 'upload-id' };
      if (command instanceof AbortMultipartUploadCommand) {
        cleanupSignal = abortSignal;
        return cleanup.promise;
      }
      throw new Error('must not complete a cancelled upload');
    });
    const job = new AbortController();
    let settled = false;
    const result = storage.uploadFileFromUrl({
      ...file(),
      signal: job.signal,
      requestTimeoutMs: 100,
    });
    result.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      }
    );
    await jest.advanceTimersByTimeAsync(0);
    job.abort(new Error('job cancelled'));
    await jest.advanceTimersByTimeAsync(0);
    expect(partSignal!.aborted).toBe(true);
    expect(cleanupSignal!.aborted).toBe(false);
    expect(settled).toBe(false);
    cleanup.resolve({});
    await expect(result).rejects.toThrow('job cancelled');
    expect(savedStatuses).toEqual(['pending']);
    expect(
      send.mock.calls.some(
        ([command]) => command instanceof CompleteMultipartUploadCommand
      )
    ).toBe(false);
  });

  it('times out part PUT separately without aborting the whole job', async () => {
    const job = new AbortController();
    fetchMock.mockImplementationOnce((_, { signal }) => waitForAbort(signal));
    const result = storage.uploadFileFromUrl({
      ...file(),
      signal: job.signal,
      requestTimeoutMs: 100,
    });
    const rejected = expect(result).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    await jest.advanceTimersByTimeAsync(100);
    await rejected;
    expect(job.signal.aborted).toBe(false);
    expect(send.mock.calls.at(-1)![0]).toBeInstanceOf(
      AbortMultipartUploadCommand
    );
    expect(savedStatuses).toEqual(['pending']);
  });

  it('aborts completion, awaits cleanup, and retains pending metadata', async () => {
    const cleanup = pending<any>();
    let completionSignal: AbortSignal;
    send.mockImplementation(async (command, { abortSignal }) => {
      if (command instanceof CreateMultipartUploadCommand)
        return { UploadId: 'upload-id' };
      if (command instanceof CompleteMultipartUploadCommand) {
        completionSignal = abortSignal;
        return waitForAbort(abortSignal);
      }
      return cleanup.promise;
    });
    const result = storage.uploadFileFromUrl({
      ...file(),
      requestTimeoutMs: 100,
    });
    const rejected = expect(result).rejects.toMatchObject({
      name: 'TimeoutError',
      objectStorage: { objectId: 'object-id', uploadId: 'upload-id' },
    });
    await jest.advanceTimersByTimeAsync(100);
    expect(completionSignal!.aborted).toBe(true);
    expect(savedStatuses).toEqual(['pending']);
    cleanup.resolve({});
    await rejected;
    expect(repo.delete).toBeUndefined();
    expect(savedStatuses).toEqual(['pending']);
  });

  it('awaits non-abortable local signing, then cleans up without uploading', async () => {
    const signing = pending<string>();
    (getSignedUrl as jest.Mock).mockReturnValueOnce(signing.promise);
    const job = new AbortController();
    let settled = false;
    const result = storage.uploadFileFromUrl({
      ...file(),
      signal: job.signal,
      requestTimeoutMs: 100,
    });
    result.catch(() => {
      settled = true;
    });
    await jest.advanceTimersByTimeAsync(0);
    job.abort(new Error('cancel signing'));
    await jest.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    signing.resolve('https://upload.test/part-1');
    await expect(result).rejects.toThrow('cancel signing');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(send.mock.calls.at(-1)![0]).toBeInstanceOf(
      AbortMultipartUploadCommand
    );
    expect(savedStatuses).toEqual(['pending']);
  });

  it('bounds cleanup independently and reports cleanup failure with recovery metadata', async () => {
    fetchMock.mockRejectedValueOnce(new Error('part failed'));
    send.mockImplementation(async (command, { abortSignal }) => {
      if (command instanceof CreateMultipartUploadCommand)
        return { UploadId: 'upload-id' };
      return waitForAbort(abortSignal);
    });
    const result = storage.uploadFileFromUrl({
      ...file(),
      requestTimeoutMs: 100,
    });
    const rejected = expect(result).rejects.toMatchObject({
      message: 'part failed',
      cleanupError: { name: 'TimeoutError' },
      objectStorage: { objectId: 'object-id', uploadId: 'upload-id' },
    });
    await jest.advanceTimersByTimeAsync(100);
    await rejected;
    expect(savedStatuses).toEqual(['pending']);
  });
  it('retains a known committed object when cancellation arrives with completion success', async () => {
    const job = new AbortController();
    send.mockImplementation(async (command) => {
      if (command instanceof CreateMultipartUploadCommand)
        return { UploadId: 'upload-id' };
      if (command instanceof CompleteMultipartUploadCommand) {
        job.abort('cancel after commit');
        return {};
      }
      throw new Error('must not roll back a committed object');
    });
    await expect(
      storage.uploadFileFromUrl({
        ...file(),
        signal: job.signal,
        requestTimeoutMs: 100,
      })
    ).rejects.toMatchObject({
      message: 'cancel after commit',
      objectStorage: { committed: true, objectId: 'object-id' },
    });
    expect(savedStatuses).toEqual(['pending']);
    expect(
      send.mock.calls.some(
        ([command]) => command instanceof AbortMultipartUploadCommand
      )
    ).toBe(false);
  });

  it('does not roll back committed storage when the ready-state database write fails', async () => {
    repo.save
      .mockImplementationOnce(async (value: any) => {
        savedStatuses.push(value.status);
        stored = value;
        return value;
      })
      .mockRejectedValueOnce(new Error('database disconnected'));
    await expect(
      storage.uploadFileFromUrl({ ...file(), requestTimeoutMs: 100 })
    ).rejects.toMatchObject({
      message: 'database disconnected',
      objectStorage: { committed: true, objectId: 'object-id' },
    });
    expect(
      send.mock.calls.some(
        ([command]) => command instanceof AbortMultipartUploadCommand
      )
    ).toBe(false);
  });
  it('rejects a pre-aborted request without persistence or network work', async () => {
    const job = new AbortController();
    job.abort(new Error('already cancelled'));
    await expect(
      storage.uploadFileFromUrl({ ...file(), signal: job.signal })
    ).rejects.toThrow('already cancelled');
    expect(repo.save).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([0, -1, Infinity, NaN, 1.5, 2 ** 31])(
    'rejects invalid timeout %s before saving metadata',
    async (requestTimeoutMs) => {
      await expect(
        storage.uploadFileFromUrl({ ...file(), requestTimeoutMs })
      ).rejects.toThrow(RangeError);
      expect(repo.save).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    }
  );

  it('does not start multipart creation after cancellation during metadata save', async () => {
    const job = new AbortController();
    repo.save.mockImplementationOnce(async (value: any) => {
      job.abort(new Error('cancelled in DB'));
      return value;
    });
    await expect(
      storage.uploadFileFromUrl({ ...file(), signal: job.signal })
    ).rejects.toMatchObject({
      message: 'cancelled in DB',
      objectStorage: { objectId: 'object-id' },
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('does not complete storage after cancellation during metadata lookup', async () => {
    const job = new AbortController();
    repo.findOneOrFail.mockImplementationOnce(async () => {
      job.abort(new Error('cancelled in lookup'));
      return { id: 'object-id', key: 'key' };
    });
    await expect(
      storage.completeUpload(
        'object-id',
        { uploadId: 'existing', parts: [] },
        { signal: job.signal }
      )
    ).rejects.toThrow('cancelled in lookup');
    expect(send).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('refreshes only requested part ranges without creating another multipart upload', async () => {
    const parts = await provider.refreshSignedUrls(
      { key: 'key', contentLength: 250_000_000 } as any,
      { uploadId: 'existing', parts: [3, 1] }
    );
    expect(
      parts.map(({ part, rangeStart, rangeEnd }) => ({
        part,
        rangeStart,
        rangeEnd,
      }))
    ).toEqual([
      { part: 3, rangeStart: 209_715_200, rangeEnd: 250_000_000 },
      { part: 1, rangeStart: 0, rangeEnd: 104_857_600 },
    ]);
    expect(send).not.toHaveBeenCalled();
  });

  it('awaits refresh signing cancellation without aborting the existing multipart upload', async () => {
    const signing = pending<string>();
    (getSignedUrl as jest.Mock).mockReturnValueOnce(signing.promise);
    const job = new AbortController();
    const result = provider.refreshSignedUrls(
      { key: 'key', contentLength: 250_000_000 } as any,
      { uploadId: 'existing', parts: [1, 2] },
      { signal: job.signal }
    );
    job.abort(new Error('cancel refresh'));
    signing.resolve('https://upload.test/refreshed');
    await expect(result).rejects.toThrow('cancel refresh');
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });
});
