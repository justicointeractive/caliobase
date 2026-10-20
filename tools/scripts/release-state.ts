import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Manifest = Record<string, unknown>;
const dependencySections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

function dependencies(manifest: Manifest | null, section: string): Manifest {
  const value = manifest?.[section];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Manifest)
    : {};
}

/** Restore release-owned metadata without reverting subsequent source edits. */
export function reconcileReleasedManifest(
  current: Manifest,
  released: Manifest,
  source: Manifest | null,
  workspaceNames: Set<string>,
): Manifest {
  if (current.name !== released.name) {
    throw new Error(`Release manifest identity changed for ${current.name}`);
  }

  const result = { ...current, version: released.version };
  for (const section of dependencySections) {
    const present = dependencies(current, section);
    const previous = dependencies(released, section);
    const base = dependencies(source, section);
    const next = { ...present };

    for (const name of new Set([
      ...Object.keys(present),
      ...Object.keys(previous),
    ])) {
      if (!workspaceNames.has(name) || present[name] === previous[name]) {
        continue;
      }
      if (!source) {
        throw new Error(
          `Cannot reconcile ${current.name} ${section}.${name}: release source manifest is unavailable`,
        );
      }
      // A different source value is an intentional edit, not stale release state.
      if (present[name] !== base[name]) {
        continue;
      }
      if (previous[name] === undefined) {
        delete next[name];
      } else {
        next[name] = previous[name];
      }
    }

    if (Object.keys(next).length || current[section] !== undefined) {
      result[section] = next;
    }
  }
  return result;
}

interface ReleaseProject {
  project: string;
  packageName: string;
  root: string;
}

export function restoreReleasedManifests(
  projects: ReleaseProject[],
  cwd = process.cwd(),
): string[] {
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const names = new Set(projects.map(({ packageName }) => packageName));
  // Match Nx's stable-versus-prerelease ordering.
  const tags = git(
    '-c',
    'versionsort.suffix=-',
    'tag',
    '--sort=-v:refname',
  ).split('\n');
  const pending: Array<{ path: string; manifest: Manifest }> = [];

  for (const project of projects) {
    const prefix = `${project.project}-`;
    const tag = tags.find(
      (candidate) =>
        candidate.startsWith(prefix) &&
        /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(
          candidate.slice(prefix.length),
        ),
    );
    if (!tag) {
      continue; // First release: the manifest is the initial version authority.
    }
    const path = join(project.root, 'package.json');
    const current = JSON.parse(
      readFileSync(join(cwd, path), 'utf8'),
    ) as Manifest;
    const released = JSON.parse(git('show', `${tag}:${path}`)) as Manifest;
    if (released.version !== tag.slice(prefix.length)) {
      throw new Error(`Release tag ${tag} disagrees with ${path}`);
    }

    let source: Manifest | null = null;
    // Only generated release commits have a known source/base parent.
    if (git('log', '-1', '--format=%s', tag).startsWith('chore(release):')) {
      try {
        source = JSON.parse(git('show', `${tag}^:${path}`)) as Manifest;
      } catch {
        // Reconciliation below fails closed if this missing base is needed.
      }
    }
    const restored = reconcileReleasedManifest(
      current,
      released,
      source,
      names,
    );
    if (JSON.stringify(restored) !== JSON.stringify(current)) {
      pending.push({ path, manifest: restored });
    }
  }

  // Validate every package before mutating any manifest.
  for (const { path, manifest } of pending) {
    writeFileSync(join(cwd, path), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Restored released metadata: ${path}`);
  }
  return pending.map(({ path }) => path);
}

/** Nx only stages its own changes, not baseline metadata restored beforehand. */
export function amendReleaseMetadata(
  paths: string[],
  cwd = process.cwd(),
): void {
  if (!paths.length) {
    return;
  }
  execFileSync('git', ['add', '--', ...paths], { cwd, stdio: 'pipe' });
  const diff = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd });
  if (diff.status === 0) {
    return;
  }
  if (diff.status !== 1) {
    throw new Error('Unable to inspect staged release metadata');
  }
  execFileSync('git', ['commit', '--amend', '--no-edit'], {
    cwd,
    stdio: 'pipe',
  });
}
