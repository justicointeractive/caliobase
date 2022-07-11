import { open, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { setTimeout } from 'timers/promises';

export async function mutex(
  name: string,
  action: () => Promise<void>,
  reaquireDelay = 250,
  reaquireTimeout = 15000
) {
  async function acquireLock() {
    try {
      const path = `${tmpdir()}/${name}.lock`;
      const handle = await open(path, 'wx');
      return {
        close: async () => {
          await handle.close();
          await rm(path);
        },
      };
    } catch (err) {
      return false;
    }
  }
  const start = Date.now();
  do {
    const lock = await acquireLock();
    if (lock) {
      await action();
      await lock.close();
      return;
    }
    await setTimeout(reaquireDelay);
  } while (Date.now() - start < reaquireTimeout);

  throw new Error(`timeout attempting to acquire lock ${name}`);
}
