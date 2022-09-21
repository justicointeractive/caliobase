import { Tree } from '@nrwl/devkit';
import { readFile } from 'fs/promises';

export async function expectDependenciesMatch(tree: Tree, path: string) {
  type PackageJson = {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

  const parsed: PackageJson = JSON.parse(tree.read(path)?.toString() ?? '{}');
  const parsedRoot: PackageJson = JSON.parse(
    await readFile('package.json', 'utf8')
  );
  expect(parsedRoot.dependencies).toMatchObject(parsed.dependencies);
  expect(parsedRoot.devDependencies).toMatchObject(parsed.devDependencies);
}
