#!/usr/bin/env tsx
import { spawnSync } from 'node:child_process';
import { prerelease, gt, valid } from 'semver';
import {
  checkBuiltManifests,
  checkManifests,
  checkVersions,
  git,
  json,
  projects,
  ReleaseProject,
} from './release-state';

function command(command: string, args: string[], inherit = false): string {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: inherit ? 'inherit' : 'pipe',
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed: ${
        result.stderr || result.stdout || result.status
      }`
    );
  }
  return (result.stdout || '').trim();
}
function registryVersions(name: string): string[] {
  const result = spawnSync('npm', ['view', name, 'versions', '--json'], {
    encoding: 'utf8',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status === 0) {
    const parsed = JSON.parse(result.stdout);
    const versions = typeof parsed === 'string' ? [parsed] : parsed;
    if (
      !Array.isArray(versions) ||
      !versions.every((version) => valid(version))
    ) {
      throw new Error(`Invalid registry version response for ${name}`);
    }
    return versions;
  }
  // Only npm's structured E404 means missing. Auth/network failures are errors.
  let error: any;
  try {
    error = JSON.parse(result.stdout);
  } catch {
    /* handled below */
  }
  if (error?.error?.code === 'E404') {
    return [];
  }
  throw new Error(
    `Unable to read registry versions for ${name}: ${
      result.stderr || result.stdout
    }`
  );
}
function validateRegistry(
  specs: ReleaseProject[],
  allowExisting: boolean,
  verifyExisting = new Set<string>()
): ReleaseProject[] {
  return specs.filter((spec) => {
    const { name, version } = spec.manifest;
    const versions = registryVersions(name);
    if (versions.includes(version)) {
      if (!allowExisting) {
        throw new Error(
          `${name}@${version} already exists on npm; choose a fresh version in this PR`
        );
      }
      if (verifyExisting.has(name)) {
        const publishedHead = JSON.parse(
          command('npm', ['view', `${name}@${version}`, 'gitHead', '--json'])
        );
        if (publishedHead !== git(['rev-parse', 'HEAD'])) {
          throw new Error(
            `${name}@${version} was published from a different or unknown commit; immutable version collision`
          );
        }
      }
      console.log(`Already published: ${name}@${version}`);
      return false;
    }
    if (versions.some((published) => gt(published, version))) {
      throw new Error(
        `${name}@${version} is behind an already published version; bump the manifest`
      );
    }
    return true;
  });
}
function main(): void {
  const [mode = 'check', ...args] = process.argv.slice(2);
  const baseArg = args.find((arg) => arg.startsWith('--base='));
  const dryRun = args.includes('--dry-run');
  const allowPublished = args.includes('--allow-published');
  if (
    !['check', 'publish', 'tag'].includes(mode) ||
    args.some(
      (arg) =>
        !['--dry-run', '--allow-published'].includes(arg) &&
        !arg.startsWith('--base=')
    )
  ) {
    throw new Error(
      'Usage: npm run release -- check --base=<ref> [--allow-published] | publish [--dry-run] | tag [--dry-run]'
    );
  }
  const specs = projects();
  checkManifests(specs, json('package-lock.json'));
  if (mode === 'check') {
    if (!baseArg) {
      throw new Error('check requires --base=<PR base SHA or branch>');
    }
    const changed = checkVersions(baseArg.slice('--base='.length));
    validateRegistry(
      changed,
      allowPublished,
      new Set(changed.map(({ manifest }) => manifest.name))
    );
    for (const { manifest } of changed) {
      console.log(`Release: ${manifest.name}@${manifest.version}`);
    }
    if (!changed.length) {
      console.log('No package version changes.');
    }
    return;
  }
  if (git(['status', '--porcelain', '--untracked-files=no'])) {
    throw new Error(
      'Publishing/tagging requires a clean tracked checkout of the reviewed commit'
    );
  }
  const changed = checkVersions(
    baseArg ? baseArg.slice('--base='.length) : 'HEAD^'
  );
  const verifyExisting = new Set(changed.map(({ manifest }) => manifest.name));
  if (mode === 'publish') {
    const missing = validateRegistry(specs, true, verifyExisting);
    command('npm', ['run', 'build'], true);
    checkBuiltManifests(specs);
    if (!missing.length) {
      console.log('All manifest versions already published.');
      return;
    }
    // Per-project calls let prereleases use next without moving latest backwards.
    for (const { project, manifest } of missing) {
      command(
        'npx',
        [
          'nx',
          'release',
          'publish',
          `--projects=${project}`,
          `--tag=${prerelease(manifest.version) ? 'next' : 'latest'}`,
          '--outputStyle=static',
          ...(dryRun ? ['--dry-run'] : []),
        ],
        true
      );
    }
    return;
  }
  // Mark only versions introduced by this merge. Replay its run for recovery;
  // never backfill older missing markers at an unrelated newer HEAD.
  const unpublished = validateRegistry(specs, true, verifyExisting);
  if (unpublished.length) {
    throw new Error(
      'Cannot tag: some manifest versions have not been published'
    );
  }
  const tags: string[] = [];
  for (const { project, manifest } of changed) {
    const tag = `${project}-${manifest.version}`;
    const existing = spawnSync('git', [
      'rev-parse',
      '-q',
      '--verify',
      `refs/tags/${tag}`,
    ]);
    if (existing.status === 0) {
      if (
        verifyExisting.has(manifest.name) &&
        git(['rev-parse', `${tag}^{commit}`]) !== git(['rev-parse', 'HEAD'])
      ) {
        throw new Error(
          `Release marker ${tag} already points at another commit`
        );
      }
      tags.push(`refs/tags/${tag}`);
      continue;
    }
    if (dryRun) {
      console.log(`Would tag HEAD: ${tag}`);
      continue;
    }
    command('git', ['tag', '-a', tag, '-m', tag, 'HEAD']);
    tags.push(`refs/tags/${tag}`);
  }
  if (tags.length && !dryRun) {
    command('git', ['push', '--atomic', 'origin', ...tags], true);
  }
}
try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
