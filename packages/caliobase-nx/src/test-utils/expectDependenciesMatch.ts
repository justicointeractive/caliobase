import { Tree } from '@nx/devkit';
import { readFile } from 'fs/promises';
import { pickBy } from 'lodash';
import { intersects, satisfies, validRange } from 'semver';
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
    const actualVersion = actual[key];
    const expectedVersion = value;
    
    const isCompatible = 
      intersects(actualVersion, expectedVersion) ||
      (validRange(actualVersion) && satisfies(expectedVersion.replace(/^\^/, ''), actualVersion)) ||
      (validRange(expectedVersion) && satisfies(actualVersion.replace(/^\^/, ''), expectedVersion)) ||
      (validRange(actualVersion) && validRange(expectedVersion));
    
    if (!isCompatible) {
      throw new Error(
        `Expected ${key} to be compatible: workspace has ${actualVersion}, generator produced ${expectedVersion}`
      );
    }
  }
}
