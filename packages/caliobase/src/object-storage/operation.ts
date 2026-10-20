import { ObjectStorageOperationOptions } from './AbstractObjectStorageProvider';

export type ObjectStorageFailure = Error & {
  objectStorage?: {
    objectId?: string;
    key?: string;
    uploadId?: string;
    committed?: boolean;
  };
  cleanupError?: unknown;
};

export function storageError(
  cause: unknown,
  details: NonNullable<ObjectStorageFailure['objectStorage']>
): ObjectStorageFailure {
  const error: ObjectStorageFailure =
    cause !== null &&
    (typeof cause === 'object' || typeof cause === 'function') &&
    Object.isExtensible(cause)
      ? (cause as ObjectStorageFailure)
      : Object.assign(
          new Error(
            typeof cause === 'string'
              ? cause
              : 'Object storage operation failed'
          ),
          { cause }
        );
  error.objectStorage = { ...error.objectStorage, ...details };
  return error;
}

// Await the actual operation, including its cancellation cleanup. Never race it
// against a rejection that would leave the underlying work running.
export async function withRequest<T>(
  options: ObjectStorageOperationOptions,
  operation: (signal: AbortSignal) => Promise<T>,
  checkAfter = true
): Promise<T> {
  validateOperationOptions(options);
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) {
    abort();
  } else {
    options.signal?.addEventListener('abort', abort, { once: true });
  }
  const timer =
    options.requestTimeoutMs === undefined
      ? undefined
      : setTimeout(
          () =>
            controller.abort(
              new DOMException(
                'Object storage request timed out',
                'TimeoutError'
              )
            ),
          options.requestTimeoutMs
        );
  try {
    controller.signal.throwIfAborted();
    const result = await operation(controller.signal);
    if (checkAfter) {
      controller.signal.throwIfAborted();
    }
    return result;
  } catch (error) {
    controller.abort(error);
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

export function validateOperationOptions(
  options: ObjectStorageOperationOptions
): void {
  if (
    options.requestTimeoutMs !== undefined &&
    (!Number.isInteger(options.requestTimeoutMs) ||
      options.requestTimeoutMs <= 0 ||
      options.requestTimeoutMs > 2_147_483_647)
  ) {
    throw new RangeError('requestTimeoutMs must be a positive 32-bit integer');
  }
}
