import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gt, satisfies, valid } from 'semver';

export const dependencySections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;
export interface Manifest {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}
export interface ReleaseProject {
  project: string;
  root: string;
  manifest: Manifest;
}
export function git(args: string[], cwd = process.cwd()): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
}
export function json(path: string, cwd = process.cwd()) {
  return JSON.parse(readFileSync(join(cwd, path), 'utf8'));
}
export function projects(cwd = process.cwd()): ReleaseProject[] {
  return readdirSync(join(cwd, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap(({ name }) => {
      const root = `packages/${name}`;
      if (!existsSync(join(cwd, root, 'package.json'))) {
        return [];
      }
      const manifest: Manifest = json(`${root}/package.json`, cwd);
      if (manifest.private) {
        return [];
      }
      const config = json(`${root}/project.json`, cwd);
      if (!manifest.name || !valid(manifest.version)) {
        throw new Error(`Invalid package identity/version: ${root}`);
      }
      return [{ project: config.name || name, root, manifest }];
    });
}
function sorted(value: Record<string, string> = {}): string {
  return JSON.stringify(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
  );
}
export function checkManifests(specs: ReleaseProject[], lock: any): void {
  const names = new Map(
    specs.map(({ manifest }) => [manifest.name, manifest.version])
  );
  for (const { root, manifest } of specs) {
    const locked = lock.packages?.[root];
    if (!locked || locked.version !== manifest.version) {
      throw new Error(
        `${root}: package-lock.json version does not match package.json`
      );
    }
    for (const section of dependencySections) {
      if (sorted(manifest[section]) !== sorted(locked[section])) {
        throw new Error(
          `${root}: package-lock.json ${section} do not match package.json`
        );
      }
      for (const [name, range] of Object.entries(manifest[section] || {})) {
        const version = names.get(name);
        if (version && !satisfies(version, range)) {
          throw new Error(
            `${root}: ${section}.${name}=${range} does not include workspace version ${version}; update the dependency and bump this consumer`
          );
        }
      }
    }
  }
}
/** Main's reviewed manifests, never release tags, are the comparison authority. */
export function checkVersions(
  base: string,
  cwd = process.cwd()
): ReleaseProject[] {
  // Resolve before interpolating the revision in git show/diff arguments.
  const ref = git(['rev-parse', '--verify', `${base}^{commit}`], cwd);
  const specs = projects(cwd);
  checkManifests(specs, json('package-lock.json', cwd));
  const changedFiles = git(
    ['diff', '--name-only', '--no-renames', ref, '--'],
    cwd
  ).split('\n');
  const priorRoot = JSON.parse(git(['show', `${ref}:package.json`], cwd));
  const currentRoot = json('package.json', cwd);
  const previousNx = JSON.parse(git(['show', `${ref}:nx.json`], cwd));
  const currentNx = json('nx.json', cwd);
  delete previousNx.release;
  delete currentNx.release;
  const previousLock = JSON.parse(
    git(['show', `${ref}:package-lock.json`], cwd)
  );
  const currentLock = json('package-lock.json', cwd);
  const externalLock = (lock: any) =>
    JSON.stringify(
      Object.entries(lock.packages || {})
        .filter(
          ([path, entry]: [string, any]) =>
            path.startsWith('node_modules/') && !entry.link
        )
        .sort(([a], [b]) => a.localeCompare(b))
    );
  const sharedChanged =
    JSON.stringify(previousNx) !== JSON.stringify(currentNx) ||
    externalLock(previousLock) !== externalLock(currentLock) ||
    ['dependencies', 'devDependencies'].some(
      (section) => sorted(priorRoot[section]) !== sorted(currentRoot[section])
    ) ||
    changedFiles.some((path) =>
      /^(tsconfig[^/]*\.json|babel\.config\.json)$/.test(path)
    );
  const released: ReleaseProject[] = [];
  for (const spec of specs) {
    const path = `${spec.root}/package.json`;
    const present = git(['ls-tree', '--name-only', ref, '--', path], cwd);
    if (!present) {
      released.push(spec);
      continue;
    }
    const previous: Manifest = JSON.parse(git(['show', `${ref}:${path}`], cwd));
    if (previous.name !== spec.manifest.name || !valid(previous.version)) {
      throw new Error(
        `${path}: package identity changed or base version invalid`
      );
    }
    const changed =
      sharedChanged ||
      changedFiles.some((file) => file.startsWith(`${spec.root}/`));
    if (
      spec.manifest.version !== previous.version &&
      !gt(spec.manifest.version, previous.version)
    ) {
      throw new Error(
        `${path}: version must increase from ${previous.version}, not ${spec.manifest.version}`
      );
    }
    if (changed && !gt(spec.manifest.version, previous.version)) {
      throw new Error(
        `${path}: changed package needs a version bump above ${previous.version}`
      );
    }
    if (spec.manifest.version !== previous.version) {
      released.push(spec);
    }
  }
  return released;
}
/** Build tools may add fields, but may not silently choose versions or internal pins. */
export function checkBuiltManifests(
  specs: ReleaseProject[],
  cwd = process.cwd()
): void {
  const names = new Set(specs.map(({ manifest }) => manifest.name));
  for (const { root, manifest } of specs) {
    const built: Manifest = json(`dist/${root}/package.json`, cwd);
    if (built.name !== manifest.name || built.version !== manifest.version) {
      throw new Error(
        `${root}: build changed the reviewed package name/version`
      );
    }
    for (const section of dependencySections) {
      for (const name of names) {
        if (built[section]?.[name] !== manifest[section]?.[name]) {
          throw new Error(
            `${root}: build changed ${section}.${name}; declare the dependency in source`
          );
        }
      }
    }
  }
}
