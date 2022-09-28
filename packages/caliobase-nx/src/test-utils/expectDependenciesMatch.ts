import { Tree } from '@nrwl/devkit';
import { readFile } from 'fs/promises';
import { workspaceProjectVersions } from '../lib/versions';

export async function expectDependenciesMatch(tree: Tree, path: string) {
  type PackageJson = {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };

  const workspacePackageJson: PackageJson = JSON.parse(
    await readFile('package.json', 'utf8')
  );

  Object.assign(workspacePackageJson.dependencies, workspaceProjectVersions);

  const projectPackageJson: PackageJson = JSON.parse(
    tree.read(path)?.toString() ?? '{}'
  );

  expect(workspacePackageJson.dependencies).toMatchObject(
    projectPackageJson.dependencies
  );
  expect(workspacePackageJson.devDependencies).toMatchObject(
    projectPackageJson.devDependencies
  );
}
