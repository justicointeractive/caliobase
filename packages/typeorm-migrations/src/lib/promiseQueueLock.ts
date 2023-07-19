type LockHandle = {
  release: () => Promise<void>;
};

type Lock = {
  acquire: () => Promise<LockHandle>;
};

/**
 * A lock implementation only useful for applications with a single process/instance. Not useful for distributed applications.
 */
export class PromiseQueueLock implements Lock {
  private queue: (() => void)[] = [];
  private isLocked = false;

  async acquire() {
    if (this.isLocked) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.isLocked = true;
    return {
      release: async () => {
        this.isLocked = false;
        const next = this.queue.shift();
        if (next) {
          next();
        }
      },
    };
  }
}
