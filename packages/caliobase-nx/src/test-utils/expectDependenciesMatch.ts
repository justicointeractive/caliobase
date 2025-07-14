import { Tree } from '@nx/devkit';
import { readFile } from 'fs/promises';
import { pickBy } from 'lodash';
import { intersects } from 'semver';
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

  expectToMatchSemverRanges(
    workspacePackageJson.dependencies || {},
    pickBy(
      projectPackageJson.dependencies || {},
      (value, key) => key in (workspacePackageJson.dependencies || {})
    )
  );
  expectToMatchSemverRanges(
    workspacePackageJson.devDependencies || {},
    pickBy(
      projectPackageJson.devDependencies || {},
      (value, key) => key in (workspacePackageJson.devDependencies || {})
    )
  );
}

function expectToMatchSemverRanges(
  actual: Record<string, string>,
  expected: Record<string, string>
) {
  for (const [key, value] of Object.entries(expected)) {
    if (!intersects(actual[key], value)) {
      throw new Error(
        `Expected ${key} to intersect ${value} but found ${actual[key]}`
      );
    }
  }
}
