import { open, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { setTimeout } from 'timers/promises';

export async function mutex<T>(
  name: string,
  action: () => Promise<T>,
  reaquireDelay = 250,
  reaquireTimeout = 15_000
): Promise<T> {
  const staleTime = reaquireTimeout * 2;
  const updateMtimeInterval = reaquireTimeout * 0.5;

  async function acquireLock() {
    const path = `${tmpdir()}/${name}.lock`;
    try {
      const handle = await open(path, 'wx');
      const updateInterval = setInterval(async () => {
        await handle.write(new Date().toISOString());
      }, updateMtimeInterval);
      return {
        release: async () => {
          clearInterval(updateInterval);
          await handle.close();
          await rm(path);
        },
      };
    } catch (err) {
      try {
        const fileStat = await stat(path);
        if (fileStat.mtimeMs < Date.now() - staleTime) {
          await rm(path);
        }
        // eslint-disable-next-line no-empty
      } catch (err) {}
      return false;
    }
  }
  const start = Date.now();
  do {
    const lock = await acquireLock();
    if (lock) {
      try {
        return await action();
      } finally {
        await lock.release();
      }
    }
    await setTimeout(reaquireDelay);
  } while (Date.now() - start < reaquireTimeout);

  throw new Error(`timeout attempting to acquire lock ${name}`);
}
