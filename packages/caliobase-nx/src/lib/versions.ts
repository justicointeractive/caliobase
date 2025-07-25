import { version as caliobaseUiVersion } from '@caliobase/caliobase-ui/package.json';
import { version as caliobaseVersion } from '@caliobase/caliobase/package.json';
import { addDependenciesToPackageJson, Tree } from '@nx/devkit';
import { pick } from 'lodash';

/* eslint-disable @typescript-eslint/no-var-requires */
export const workspaceProjectVersions = {
  '@caliobase/caliobase-ui': caliobaseUiVersion,
  '@caliobase/caliobase': caliobaseVersion,
};

export const versions = {
  nodemailer: '^6.7.5',
  '@types/nodemailer': '^6.4.4',
  '@nestjs/swagger': require('@nestjs/swagger/package.json').version as string,
  '@nestjs/common': require('@nestjs/common/package.json').version as string,
  '@nestjs/core': require('@nestjs/core/package.json').version as string,
  '@nestjs/platform-express': require('@nestjs/platform-express/package.json').version as string,
  '@nestjs/schematics': require('@nestjs/schematics/package.json').version as string,
  '@nestjs/testing': require('@nestjs/testing/package.json').version as string,
  '@aws-sdk/client-ses': '^3.171.0',
  ...workspaceProjectVersions,
};
/* eslint-enable @typescript-eslint/no-var-requires */

export type Dependency = keyof typeof versions;

export function pickVersions(dependencies: Dependency[]) {
  return pick(versions, dependencies);
}

export function addDependencyVersionsToPackageJson(
  tree: Tree,
  dependencies: Dependency[],
  devDependencies?: Dependency[]
) {
  devDependencies = [...(devDependencies ?? [])];

  for (const dependency of dependencies) {
    const typesDependency = `@types/${dependency}`;
    if (
      !(devDependencies as string[]).includes(typesDependency) &&
      typesDependency in versions
    ) {
      devDependencies.push(typesDependency as Dependency);
    }
  }

  return addDependenciesToPackageJson(
    tree,
    pickVersions(dependencies),
    pickVersions(devDependencies)
  );
}
