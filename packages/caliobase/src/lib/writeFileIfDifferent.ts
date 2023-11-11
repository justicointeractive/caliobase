import { readFile, writeFile } from 'fs/promises';

export async function writeFileIfDifferent(path: any, contents: string) {
  try {
    const existing = await readFile(path, 'utf-8');
    if (existing === contents) {
      return;
    }
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      throw e;
    }
  }
  await writeFile(path, contents);
}
