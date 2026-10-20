import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { checkVersions, checkBuiltManifests } from './release-state';

const repo = resolve(__dirname, '../..');
function fixture(run: (f: ReturnType<typeof setup>) => void) {
  const f = setup();
  try {
    run(f);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
}
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'caliobase-release-'));
  const write = (path: string, value: unknown) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(
      join(root, path),
      typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`
    );
  };
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
  const manifest = (name: string) =>
    JSON.parse(
      readFileSync(join(root, `packages/${name}/package.json`), 'utf8')
    );
  const sync = () =>
    write('package-lock.json', {
      lockfileVersion: 3,
      packages: Object.fromEntries(
        ['core', 'consumer'].map((name) => [`packages/${name}`, manifest(name)])
      ),
    });
  const commit = () => {
    git('add', '.');
    git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  git('init', '-b', 'main');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  write('package.json', { name: 'fixture', private: true });
  write('nx.json', {});
  write('packages/core/package.json', {
    name: '@fixture/core',
    version: '1.0.0',
  });
  write('packages/consumer/package.json', {
    name: '@fixture/consumer',
    version: '1.0.0',
    dependencies: { '@fixture/core': '1.0.0' },
  });
  for (const name of ['core', 'consumer']) {
    write(`packages/${name}/project.json`, { name });
    write(`packages/${name}/src/index.ts`, 'export const value = 0;');
  }
  sync();
  const base = commit();
  const bump = (
    name: string,
    version: string,
    deps?: Record<string, string>
  ) => {
    write(`packages/${name}/package.json`, {
      ...manifest(name),
      version,
      ...(deps ? { dependencies: deps } : {}),
    });
    sync();
  };
  return { root, write, git, manifest, sync, commit, base, bump };
}

test('unchanged and tooling-only PRs need no release and checks do not mutate', () =>
  fixture((f) => {
    f.write('tools/release-note.md', 'tooling');
    f.commit();
    const before = f.git('status', '--porcelain');
    assert.deepEqual(checkVersions(f.base, f.root), []);
    assert.equal(f.git('status', '--porcelain'), before);
  }));
test('source changes, deletions and README edits fail without a bump', () => {
  for (const kind of ['source', 'delete', 'readme']) {
    fixture((f) => {
      if (kind === 'delete') {
        rmSync(join(f.root, 'packages/core/src/index.ts'));
      } else {
        f.write(
          `packages/core/${kind === 'source' ? 'src/index.ts' : 'README.md'}`,
          'changed'
        );
      }
      f.commit();
      assert.throws(
        () => checkVersions(f.base, f.root),
        /needs a version bump/
      );
    });
  }
});
test('invalid and decreasing versions fail', () => {
  for (const version of ['1.0', '0.9.9', '1.0.0-beta.1']) {
    fixture((f) => {
      f.bump('core', version);
      f.commit();
      assert.throws(
        () => checkVersions(f.base, f.root),
        /Invalid|must increase|does not include/
      );
    });
  }
});
test('core bump requires updating exact pins and bumping the consumer', () =>
  fixture((f) => {
    f.bump('core', '1.0.1');
    f.commit();
    assert.throws(
      () => checkVersions(f.base, f.root),
      /does not include workspace version/
    );
    f.bump('consumer', '1.0.0', { '@fixture/core': '1.0.1' });
    f.commit();
    assert.throws(() => checkVersions(f.base, f.root), /needs a version bump/);
    f.bump('consumer', '1.0.1');
    f.commit();
    assert.equal(checkVersions(f.base, f.root).length, 2);
  }));
test('compatible consumer range can remain without an unnecessary release', () =>
  fixture((f) => {
    f.bump('consumer', '1.0.0', { '@fixture/core': '^1.0.0' });
    const base = f.commit();
    f.bump('core', '1.0.1');
    f.commit();
    assert.deepEqual(
      checkVersions(base, f.root).map((s) => s.project),
      ['core']
    );
  }));
test('sequential core then consumer-only release preserves authoritative pins without tags', () =>
  fixture((f) => {
    f.bump('core', '1.0.1');
    f.bump('consumer', '1.0.1', { '@fixture/core': '1.0.1' });
    const first = f.commit();
    assert.equal(checkVersions(f.base, f.root).length, 2);
    f.write('packages/consumer/src/index.ts', 'export const value = 1;');
    f.bump('consumer', '1.0.2');
    f.commit();
    assert.deepEqual(
      checkVersions(first, f.root).map((s) => s.project),
      ['consumer']
    );
    assert.equal(f.manifest('consumer').dependencies['@fixture/core'], '1.0.1');
    assert.equal(f.git('tag', '--list'), '');
  }));
test('stale lock versions and dependency ranges fail', () =>
  fixture((f) => {
    const lock = JSON.parse(
      readFileSync(join(f.root, 'package-lock.json'), 'utf8')
    );
    f.bump('consumer', '1.0.1');
    f.write('package-lock.json', lock);
    assert.throws(
      () => checkVersions(f.base, f.root),
      /package-lock.json version/
    );
    f.sync();
    lock.packages['packages/consumer'].version = '1.0.1';
    lock.packages['packages/consumer'].dependencies['@fixture/core'] = '^0.9.0';
    f.write('package-lock.json', lock);
    assert.throws(
      () => checkVersions(f.base, f.root),
      /package-lock.json dependencies/
    );
  }));
test('shared compiler/dependency changes require all public packages bumped', () =>
  fixture((f) => {
    f.write('tsconfig.base.json', { compilerOptions: { target: 'es2022' } });
    f.commit();
    assert.throws(() => checkVersions(f.base, f.root), /needs a version bump/);
    f.bump('core', '1.0.1');
    f.bump('consumer', '1.0.1', { '@fixture/core': '1.0.1' });
    f.commit();
    assert.equal(checkVersions(f.base, f.root).length, 2);
  }));
test('artifact validation catches build-generated internal pin/version drift', () =>
  fixture((f) => {
    const specs = checkVersions(f.base, f.root);
    assert.equal(specs.length, 0);
    const { projects } = require('./release-state');
    const all = projects(f.root);
    for (const name of ['core', 'consumer']) {
      f.write(`dist/packages/${name}/package.json`, f.manifest(name));
    }
    checkBuiltManifests(all, f.root);
    f.write('dist/packages/consumer/package.json', {
      ...f.manifest('consumer'),
      dependencies: { '@fixture/core': '0.9.0' },
    });
    assert.throws(
      () => checkBuiltManifests(all, f.root),
      /build changed dependencies/
    );
  }));

test('actual CLI rejects published candidates, permits main retries and fails closed on registry errors', () =>
  fixture((f) => {
    f.bump('consumer', '1.0.1');
    f.commit();
    const bin = join(f.root, 'bin');
    mkdirSync(bin);
    f.write(
      'bin/npm',
      `#!/usr/bin/env node
if (process.env.FIXTURE_NPM_ERROR === '1') { console.log(JSON.stringify({error:{code:'E401'}})); process.exit(1); }
console.log(JSON.stringify(process.argv.includes('gitHead') ? process.env.FIXTURE_HEAD : ['1.0.0','1.0.1']));
`
    );
    chmodSync(join(bin, 'npm'), 0o755);
    const cli = (extra: string[] = [], error = '0') =>
      spawnSync(
        process.execPath,
        [
          join(repo, 'node_modules/tsx/dist/cli.mjs'),
          join(repo, 'tools/scripts/release.ts'),
          'check',
          `--base=${f.base}`,
          ...extra,
        ],
        {
          cwd: f.root,
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            FIXTURE_NPM_ERROR: error,
            FIXTURE_HEAD: f.git('rev-parse', 'HEAD'),
          },
          encoding: 'utf8',
        }
      );
    assert.match(cli().stderr, /already exists/);
    const retry = cli(['--allow-published']);
    assert.equal(retry.status, 0, retry.stderr);
    f.git('commit', '--allow-empty', '-qm', 'different commit');
    // Wrong registry provenance must not be accepted as a retry.
    const collision = spawnSync(
      process.execPath,
      [
        join(repo, 'node_modules/tsx/dist/cli.mjs'),
        join(repo, 'tools/scripts/release.ts'),
        'check',
        `--base=${f.base}`,
        '--allow-published',
      ],
      {
        cwd: f.root,
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          FIXTURE_HEAD: f.base,
        },
        encoding: 'utf8',
      }
    );
    assert.match(collision.stderr, /immutable version collision/);
    assert.match(
      cli(['--allow-published'], '1').stderr,
      /Unable to read registry/
    );
    assert.equal(f.git('status', '--porcelain', '--untracked-files=no'), '');
  }));

test('actual publish CLI retries only missing versions and dry-run never tags/pushes', () =>
  fixture((f) => {
    f.bump('consumer', '1.0.1');
    f.commit();
    mkdirSync(join(f.root, 'bin'));
    f.write(
      'bin/npm',
      `#!/bin/sh\nif [ "$1" = 'view' ]; then echo '["1.0.0"]'; else echo "npm $*" >> "$FIXTURE_CALLS"; fi\n`
    );
    f.write('bin/npx', '#!/bin/sh\necho "npx $*" >> "$FIXTURE_CALLS"\n');
    for (const name of ['npm', 'npx']) {
      chmodSync(join(f.root, 'bin', name), 0o755);
    }
    for (const name of ['core', 'consumer']) {
      f.write(`dist/packages/${name}/package.json`, f.manifest(name));
    }
    const calls = join(f.root, 'calls.log');
    const run = (mode: string) =>
      spawnSync(
        process.execPath,
        [
          join(repo, 'node_modules/tsx/dist/cli.mjs'),
          join(repo, 'tools/scripts/release.ts'),
          mode,
          '--dry-run',
        ],
        {
          cwd: f.root,
          env: {
            ...process.env,
            PATH: `${join(f.root, 'bin')}:${process.env.PATH}`,
            FIXTURE_CALLS: calls,
            FIXTURE_HEAD: f.git('rev-parse', 'HEAD'),
          },
          encoding: 'utf8',
        }
      );
    const publish = run('publish');
    assert.equal(publish.status, 0, publish.stderr);
    const commands = readFileSync(calls, 'utf8');
    assert.match(commands, /--projects=consumer.*--dry-run/);
    assert.doesNotMatch(commands, /--projects=core/);
    // A missing version may never be marked as published.
    assert.match(run('tag').stderr, /have not been published/);
    // All published: an existing local tag must not trigger a push in dry-run.
    f.write(
      'bin/npm',
      '#!/bin/sh\nif [ "$3" = "gitHead" ]; then echo "\\"$FIXTURE_HEAD\\""; else echo \'["1.0.0","1.0.1"]\'; fi\n'
    );
    chmodSync(join(f.root, 'bin/npm'), 0o755);
    f.git('tag', 'core-1.0.0');
    const tag = run('tag');
    assert.equal(tag.status, 0, tag.stderr);
    assert.match(tag.stdout, /Would tag HEAD: consumer-1.0.1/);
    assert.equal(f.git('tag', '--list'), 'core-1.0.0');
  }));

test(
  'installed Nx prepares version edits from disk without commits or tags',
  { timeout: 60_000 },
  () =>
    fixture((f) => {
      const { symlinkSync } = require('node:fs');
      symlinkSync(
        join(repo, 'node_modules'),
        join(f.root, 'node_modules'),
        'dir'
      );
      f.write('.gitignore', 'node_modules\n.nx\n');
      f.write('package.json', {
        name: 'fixture',
        private: true,
        workspaces: ['packages/*'],
      });
      f.write('nx.json', {
        release: {
          projects: ['packages/*'],
          projectsRelationship: 'independent',
          version: {
            currentVersionResolver: 'disk',
            git: { commit: false, tag: false },
          },
        },
      });
      const base = f.commit();
      const result = spawnSync(
        process.execPath,
        [
          join(repo, 'node_modules/nx/bin/nx.js'),
          'release',
          'version',
          'patch',
          '--projects=core',
          '--git-commit=false',
          '--git-tag=false',
        ],
        {
          cwd: f.root,
          env: {
            ...process.env,
            NX_DAEMON: 'false',
            NX_ISOLATE_PLUGINS: 'false',
            NX_NO_CLOUD: 'true',
            CI: 'true',
          },
          encoding: 'utf8',
        }
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.equal(f.manifest('core').version, '1.0.1');
      assert.equal(
        f.manifest('consumer').dependencies['@fixture/core'],
        '1.0.1'
      );
      assert.equal(f.manifest('consumer').version, '1.0.1');
      assert.equal(f.git('rev-parse', 'HEAD'), base);
      assert.equal(f.git('tag', '--list'), '');
    })
);
