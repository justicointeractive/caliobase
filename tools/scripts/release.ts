#!/usr/bin/env tsx
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  amendReleaseMetadata,
  restoreReleasedManifests,
} from './release-state';

const VALID_SPECIFIERS = new Set([
  'patch',
  'minor',
  'major',
  'prerelease',
  'prepatch',
  'preminor',
  'premajor',
]);

const VERSION_PATTERN_SOURCE = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?`;
const VERSION_PATTERN = new RegExp(`^${VERSION_PATTERN_SOURCE}$`);

type Mode = 'prepare' | 'publish' | 'tag';

interface ReleaseOptions {
  mode: Mode;
  specifier: string;
  preid: string;
  dryRun: boolean;
  skipEmpty: boolean;
}

interface ReleaseProjectSpec {
  project: string;
  packageName: string;
  version: string;
  root: string;
}

function usage(): string {
  return `Usage: npm run release -- [prepare|publish|tag] [patch|minor|major|prerelease|prepatch|preminor|premajor|<version>] [--preid <id>|--preid=<id>] [--dry-run] [--skip-empty]

Modes:
  prepare  Run tests/builds and create the local release version-bump commit.
           This does not publish to npm. CI publishes from this local release state.
  publish  Build and publish package versions that do not already exist on npm.
           CI publishing uses npm trusted publishing via GitHub Actions OIDC.
  tag      Create any missing release git tags for the versions on disk.
           This does not publish to npm.

Default mode is prepare.`;
}

function parseArgs(argv: string[]): ReleaseOptions {
  const options: ReleaseOptions = {
    mode: 'prepare',
    specifier: 'patch',
    preid: '',
    dryRun: false,
    skipEmpty: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === 'prepare' || arg === 'publish' || arg === 'tag') {
      options.mode = arg;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--skip-empty') {
      options.skipEmpty = true;
      continue;
    }

    if (arg === '--preid') {
      const value = argv[i + 1] ?? '';
      if (!value) {
        throw new Error('Error: --preid requires a value');
      }
      options.preid = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--preid=')) {
      options.preid = arg.slice('--preid='.length);
      continue;
    }

    if (arg === '-h' || arg === '--help') {
      console.log(usage());
      process.exit(0);
    }

    if (VALID_SPECIFIERS.has(arg) || VERSION_PATTERN.test(arg)) {
      options.specifier = arg;
      continue;
    }

    throw new Error(`Error: unknown release argument '${arg}'\n${usage()}`);
  }

  return options;
}

function run(command: string, args: string[] = []): void {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with status ${result.status ?? 1}`,
    );
  }
}

function output(command: string, args: string[] = []): string {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout.trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function commandResult(
  command: string,
  args: string[],
): { status: number; output: string } {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

function releaseProjectSpecs(): ReleaseProjectSpec[] {
  return readdirSync('packages', { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .flatMap((dirent) => {
      const root = join('packages', dirent.name);
      const packageJsonPath = join(root, 'package.json');
      const projectJsonPath = join(root, 'project.json');
      if (!existsSync(packageJsonPath) || !existsSync(projectJsonPath)) {
        return [];
      }

      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
        name?: string;
        version?: string;
        private?: boolean;
      };
      const project = JSON.parse(readFileSync(projectJsonPath, 'utf8')) as {
        name?: string;
      };

      if (!pkg.name || !pkg.version || pkg.private) {
        return [];
      }

      return [
        {
          project: project.name || dirent.name,
          packageName: pkg.name,
          version: pkg.version,
          root,
        },
      ];
    });
}

function latestReleaseTag(project: string): string | null {
  const tagPattern = new RegExp(
    `^${escapeRegExp(project)}-${VERSION_PATTERN_SOURCE}$`,
  );
  const tags = output('git', [
    '-c',
    'versionsort.suffix=-',
    'tag',
    '--sort',
    '-v:refname',
  ])
    .split('\n')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags.find((tag) => tagPattern.test(tag)) ?? null;
}

function readJsonAtRef(
  ref: string,
  path: string,
): Record<string, unknown> | null {
  const file = commandResult('git', ['show', `${ref}:${path}`]);
  if (file.status !== 0) {
    return null;
  }

  return JSON.parse(file.output) as Record<string, unknown>;
}

function withoutReleaseOnlyVersions(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const copy = { ...value };
  delete copy.version;

  return copy;
}

function packageManifestChangedBeyondReleaseVersions(
  tag: string,
  packageJsonPath: string,
): boolean {
  if (!existsSync(packageJsonPath)) {
    return false;
  }

  const previous = readJsonAtRef(tag, packageJsonPath);
  if (!previous) {
    return true;
  }

  const current = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as Record<
    string,
    unknown
  >;
  return (
    JSON.stringify(withoutReleaseOnlyVersions(previous)) !==
    JSON.stringify(withoutReleaseOnlyVersions(current))
  );
}

function projectChangedSinceTag(tag: string, root: string): boolean {
  const packageJsonPath = join(root, 'package.json');
  const nonManifestDiff = commandResult('git', [
    'diff',
    '--quiet',
    tag,
    'HEAD',
    '--',
    root,
    `:(exclude)${packageJsonPath}`,
  ]);

  return (
    nonManifestDiff.status !== 0 ||
    packageManifestChangedBeyondReleaseVersions(tag, packageJsonPath)
  );
}

function changedReleaseProjects(): string[] {
  const changedProjects: string[] = [];
  const specs = releaseProjectSpecs();

  for (const { project, root } of specs) {
    const tag = latestReleaseTag(project);
    if (!tag) {
      console.error(`Including ${project} because no release tag exists`);
      changedProjects.push(project);
      continue;
    }

    if (projectChangedSinceTag(tag, root)) {
      console.error(
        `Including ${project} because ${root} changed since ${tag}`,
      );
      changedProjects.push(project);
    }
  }

  return changedProjects;
}

function nxVersionArgs(options: ReleaseOptions): string[] {
  const args = [options.specifier, '--git-tag=false', '--git-push=false'];

  if (options.preid) {
    args.push('--preid', options.preid);
  }

  if (options.dryRun) {
    args.push('--dry-run');
  }

  return args;
}

function nxPublishArgs(options: ReleaseOptions): string[] {
  const args = ['--outputStyle=static'];

  if (options.dryRun) {
    args.push('--dry-run');
  }

  return args;
}

function syncPackageLockIntoReleaseCommit(restored: string[]): void {
  const paths = [...restored];
  if (existsSync('package-lock.json')) {
    run('npm', ['install', '--package-lock-only', '--ignore-scripts']);
    paths.push('package-lock.json');
  }
  amendReleaseMetadata(paths);
}

function validatePackageLock(): void {
  if (!existsSync('package-lock.json')) {
    return;
  }

  run('npm', ['ci', '--ignore-scripts', '--dry-run']);
}

function prepareRelease(options: ReleaseOptions): void {
  if (!options.dryRun) {
    prepareReleaseInCheckout(options);
    return;
  }

  const paths = [
    ...releaseProjectSpecs().map(({ root }) => join(root, 'package.json')),
    'package-lock.json',
  ];
  const originals = paths.map((path) => ({
    path,
    content: existsSync(path) ? readFileSync(path) : null,
  }));
  try {
    prepareReleaseInCheckout(options);
  } finally {
    for (const { path, content } of originals) {
      if (content) {
        writeFileSync(path, content);
      } else {
        rmSync(path, { force: true });
      }
    }
  }
}

function prepareReleaseInCheckout(options: ReleaseOptions): void {
  const beforeHead = output('git', ['rev-parse', 'HEAD']);

  run('git', ['fetch', '--all', '--tags']);
  const restored = restoreReleasedManifests(releaseProjectSpecs());
  if (restored.length && existsSync('package-lock.json')) {
    run('npm', ['install', '--package-lock-only', '--ignore-scripts']);
    // The graph used by tests/builds must match the restored lock, not the stale checkout.
    run('npm', ['ci']);
  }
  run('npm', ['run', 'test']);
  run('npm', ['run', 'build']);

  const releaseProjects = changedReleaseProjects();
  if (releaseProjects.length === 0) {
    const message =
      'No publishable package projects changed since their current release tags; no release PR needed.';
    if (options.skipEmpty) {
      console.log(message);
      return;
    }

    throw new Error(`Error: ${message}`);
  }

  run('npx', [
    'nx',
    'release',
    'version',
    ...nxVersionArgs(options),
    `--projects=${releaseProjects.join(',')}`,
  ]);

  if (options.dryRun) {
    return;
  }

  if (output('git', ['rev-parse', 'HEAD']) === beforeHead) {
    throw new Error(
      'Error: release versioning did not create a release commit.',
    );
  }

  syncPackageLockIntoReleaseCommit(restored);
  validatePackageLock();
  const afterHead = output('git', ['rev-parse', 'HEAD']);

  const changedManifests = output('git', [
    'diff',
    '--name-only',
    `${beforeHead}..${afterHead}`,
    '--',
    'packages/*/package.json',
  ]);

  if (!changedManifests) {
    const changedFiles = output('git', [
      'diff',
      '--name-only',
      `${beforeHead}..${afterHead}`,
    ]);
    throw new Error(
      `Error: release versioning did not change any package manifests; refusing to open an empty release PR.\nChanged files were:\n${changedFiles}`,
    );
  }
}

function publishMissingVersions(options: ReleaseOptions): void {
  const missingProjects: string[] = [];

  for (const { project, packageName, version } of releaseProjectSpecs()) {
    const spec = `${packageName}@${version}`;
    const view = commandResult('npm', ['view', spec, 'version', '--json']);

    if (view.status === 0) {
      console.error(`Already published: ${spec}`);
      continue;
    }

    if (!view.output.includes('E404')) {
      throw new Error(view.output);
    }

    console.error(`Will publish: ${spec}`);
    missingProjects.push(project);
  }

  if (missingProjects.length === 0) {
    console.log(
      'All workspace package versions already exist on npm; nothing to publish.',
    );
    return;
  }

  run('npx', [
    'nx',
    'release',
    'publish',
    `--projects=${missingProjects.join(',')}`,
    ...nxPublishArgs(options),
  ]);
}

function tagPublishedVersions(): void {
  const tags: string[] = [];
  const tagTarget = process.env.RELEASE_TAG_TARGET || 'HEAD';

  for (const { project, packageName, version } of releaseProjectSpecs()) {
    const tag = `${project}-${version}`;
    const tagExists =
      commandResult('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`])
        .status === 0;

    if (tagExists) {
      console.log(`Tag already exists: ${tag}`);
      continue;
    }

    console.log(
      `Creating tag: ${tag} for ${packageName}@${version} at ${tagTarget}`,
    );
    run('git', ['tag', '-a', tag, '-m', tag, tagTarget]);
    tags.push(`refs/tags/${tag}`);
  }

  if (tags.length === 0) {
    console.log('All release tags already exist; nothing to push.');
    return;
  }

  run('git', ['push', 'origin', ...tags]);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  switch (options.mode) {
    case 'prepare':
      prepareRelease(options);
      break;
    case 'publish':
      run('npm', ['run', 'build']);
      publishMissingVersions(options);
      break;
    case 'tag':
      tagPublishedVersions();
      break;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
