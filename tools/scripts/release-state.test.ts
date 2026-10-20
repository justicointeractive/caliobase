import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  chmodSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import {
  reconcileReleasedManifest,
  restoreReleasedManifests,
  amendReleaseMetadata,
} from './release-state';

const names = new Set(['@fixture/core', '@fixture/consumer']);
const source = {
  name: '@fixture/consumer',
  version: '1.0.0',
  dependencies: { '@fixture/core': '1.0.0', external: '^2.0.0' },
};
const released = {
  ...source,
  version: '1.0.2',
  dependencies: { ...source.dependencies, '@fixture/core': '1.0.2' },
};

test('restores released versions and pins without rewriting external dependencies', () => {
  assert.deepEqual(
    reconcileReleasedManifest(source, released, source, names),
    released,
  );
});

test('preserves intentional internal range edits and dependency removals', () => {
  const edited = {
    ...source,
    dependencies: { ...source.dependencies, '@fixture/core': '^1.0.3' },
  };
  assert.deepEqual(reconcileReleasedManifest(edited, released, source, names), {
    ...edited,
    version: '1.0.2',
  });
  const removed = { ...source, dependencies: { external: '^2.0.0' } };
  assert.deepEqual(
    reconcileReleasedManifest(removed, released, source, names),
    { ...removed, version: '1.0.2' },
  );
});

test('restores peer, optional and dev pins, and fails closed without source provenance', () => {
  for (const section of [
    'peerDependencies',
    'optionalDependencies',
    'devDependencies',
  ]) {
    const base = {
      name: '@fixture/consumer',
      version: '1.0.0',
      [section]: { '@fixture/core': '1.0.0' },
    };
    const published = {
      ...base,
      version: '1.0.2',
      [section]: { '@fixture/core': '1.0.2' },
    };
    assert.deepEqual(
      reconcileReleasedManifest(base, published, base, names),
      published,
    );
    assert.throws(
      () => reconcileReleasedManifest(base, published, null, names),
      /source manifest is unavailable/,
    );
  }
});

test(
  'sequential subset releases preserve published pins from off-main tags',
  { timeout: 120_000 },
  () => {
    const root = mkdtempSync(join(tmpdir(), 'caliobase-release-state-'));
    const repo = resolve(__dirname, '../..');
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NX_DAEMON: 'false',
      NX_ISOLATE_PLUGINS: 'false',
      NX_NO_CLOUD: 'true',
      CI: 'true',
      HUSKY: '0',
    };
    const git = (...args: string[]) =>
      execFileSync('git', args, {
        cwd: root,
        env,
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim();
    const write = (path: string, value: unknown) => {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), `${JSON.stringify(value, null, 2)}\n`);
    };
    const manifest = (project: string) =>
      JSON.parse(
        readFileSync(join(root, `packages/${project}/package.json`), 'utf8'),
      );
    const projects = ['core', 'consumer'].map((project) => ({
      project,
      packageName: `@fixture/${project}`,
      root: `packages/${project}`,
    }));
    const commit = (message: string) => {
      git('add', '.');
      git('commit', '-m', message);
    };
    const version = (project: string) =>
      execFileSync(
        process.execPath,
        [
          join(repo, 'node_modules/nx/bin/nx.js'),
          'release',
          'version',
          'patch',
          `--projects=${project}`,
          '--git-tag=false',
          '--git-push=false',
        ],
        { cwd: root, env, encoding: 'utf8', stdio: 'pipe' },
      );
    const tagVersions = () => {
      for (const { project } of projects) {
        const tag = `${project}-${manifest(project).version}`;
        if (!git('tag', '--list', tag)) {
          git('tag', tag);
        }
      }
    };

    try {
      write('package.json', {
        name: 'release-state-fixture',
        private: true,
        workspaces: ['packages/*'],
      });
      const config = JSON.parse(readFileSync(join(repo, 'nx.json'), 'utf8'));
      write('nx.json', { release: config.release, defaultBase: 'main' });
      writeFileSync(join(root, '.gitignore'), 'node_modules\n.nx\n');
      symlinkSync(
        join(repo, 'node_modules'),
        join(root, 'node_modules'),
        'dir',
      );
      for (const { project } of projects) {
        write(
          `packages/${project}/package.json`,
          project === 'consumer'
            ? source
            : { name: '@fixture/core', version: '1.0.0' },
        );
        write(`packages/${project}/project.json`, {
          name: project,
          projectType: 'library',
          targets: {},
        });
        write(`packages/${project}/index.json`, { revision: 0 });
      }
      // No external registry dependency is needed by this isolated Nx fixture.
      const consumer = manifest('consumer');
      delete consumer.dependencies.external;
      write('packages/consumer/package.json', consumer);
      git('init', '-b', 'main');
      git('config', 'user.name', 'Release fixture');
      git('config', 'user.email', 'release@example.invalid');
      commit('initial source');
      const sourceHead = git('rev-parse', 'HEAD');
      git('checkout', '-b', 'release-only');
      write('packages/core/package.json', {
        name: '@fixture/core',
        version: '1.0.2',
      });
      write('packages/consumer/package.json', {
        ...consumer,
        version: '1.0.2',
        dependencies: { '@fixture/core': '1.0.2' },
      });
      commit('chore(release): publish');
      tagVersions();
      git('checkout', '-b', 'prerelease-only', sourceHead);
      write('packages/core/package.json', {
        name: '@fixture/core',
        version: '1.0.2-beta.1',
      });
      write('packages/consumer/package.json', {
        ...consumer,
        version: '1.0.2-beta.1',
        dependencies: { '@fixture/core': '1.0.2-beta.1' },
      });
      commit('chore(release): publish');
      tagVersions();
      git('checkout', 'main');
      assert.notEqual(
        git('merge-base', 'HEAD', 'core-1.0.2'),
        git('rev-parse', 'core-1.0.2'),
      );

      write('packages/core/index.json', { revision: 1 });
      commit('fix: core change');
      let restored = restoreReleasedManifests(projects, root);
      version('core');
      amendReleaseMetadata(restored, root);
      assert.equal(manifest('core').version, '1.0.3');
      assert.equal(manifest('consumer').version, '1.0.3');
      assert.equal(manifest('consumer').dependencies['@fixture/core'], '1.0.3');
      tagVersions();

      // Simulate a fresh main checkout: none of the generated metadata landed.
      git('reset', '--hard', sourceHead);
      write('packages/core/index.json', { revision: 1 });
      write('packages/consumer/index.json', { revision: 1 });
      commit('fix: consumer-only change');
      restored = restoreReleasedManifests(projects, root);
      version('consumer');
      amendReleaseMetadata(restored, root);
      assert.equal(manifest('consumer').version, '1.0.4');
      assert.equal(manifest('consumer').dependencies['@fixture/core'], '1.0.3');
      assert.equal(manifest('core').version, '1.0.3');
      for (const { project, root: projectRoot } of projects) {
        assert.deepEqual(
          JSON.parse(git('show', `HEAD:${projectRoot}/package.json`)),
          manifest(project),
        );
      }
      tagVersions();

      // An unchanged source checkout reconstructs the published state, not a release.
      git('reset', '--hard', sourceHead);
      write('packages/core/index.json', { revision: 1 });
      write('packages/consumer/index.json', { revision: 1 });
      commit('source content unchanged');
      restoreReleasedManifests(projects, root);
      assert.deepEqual(
        manifest('consumer'),
        JSON.parse(
          git('show', 'consumer-1.0.4:packages/consumer/package.json'),
        ),
      );
      assert.deepEqual(restoreReleasedManifests(projects, root), []);

      // Exercise the actual helper entrypoint. Only expensive install/test/build
      // commands are stubbed; Git, restoration, selection and Nx are real.
      git('reset', '--hard', sourceHead);
      write('packages/core/index.json', { revision: 1 });
      write('packages/consumer/index.json', { revision: 2 });
      commit('fix: next consumer change');
      const beforeHead = git('rev-parse', 'HEAD');
      const original = projects.map(({ root: projectRoot }) =>
        readFileSync(join(root, projectRoot, 'package.json'), 'utf8'),
      );
      const lockPath = join(root, 'package-lock.json');
      const originalLock = existsSync(lockPath)
        ? readFileSync(lockPath, 'utf8')
        : null;
      const bin = join(root, 'fixture-bin');
      mkdirSync(bin);
      writeFileSync(
        join(bin, 'npm'),
        '#!/bin/sh\nif [ "$1 $2" = "run test" ] && [ "$FIXTURE_FAIL_TEST" = "1" ]; then exit 42; fi\nexit 0\n',
      );
      writeFileSync(
        join(bin, 'npx'),
        `#!/bin/sh\nshift\nexec '${process.execPath}' '${join(
          repo,
          'node_modules/nx/bin/nx.js',
        )}' "$@"\n`,
      );
      chmodSync(join(bin, 'npm'), 0o755);
      chmodSync(join(bin, 'npx'), 0o755);
      for (const fail of ['0', '1']) {
        const result = spawnSync(
          process.execPath,
          [
            join(repo, 'node_modules/tsx/dist/cli.mjs'),
            join(repo, 'tools/scripts/release.ts'),
            'prepare',
            'patch',
            '--dry-run',
          ],
          {
            cwd: root,
            env: {
              ...env,
              PATH: `${bin}:${env.PATH}`,
              FIXTURE_FAIL_TEST: fail,
            },
            encoding: 'utf8',
          },
        );
        assert.equal(
          result.status,
          fail === '0' ? 0 : 1,
          result.stdout + result.stderr,
        );
        assert.equal(git('rev-parse', 'HEAD'), beforeHead);
        assert.deepEqual(
          projects.map(({ root: projectRoot }) =>
            readFileSync(join(root, projectRoot, 'package.json'), 'utf8'),
          ),
          original,
        );
        assert.equal(
          existsSync(lockPath) ? readFileSync(lockPath, 'utf8') : null,
          originalLock,
        );
      }
      git('reset', '--hard', sourceHead);
      write('packages/core/index.json', { revision: 1 });
      write('packages/consumer/index.json', { revision: 1 });
      commit('unchanged published source content');
      const unchangedHead = git('rev-parse', 'HEAD');
      const noRelease = spawnSync(
        process.execPath,
        [
          join(repo, 'node_modules/tsx/dist/cli.mjs'),
          join(repo, 'tools/scripts/release.ts'),
          'prepare',
          'patch',
          '--skip-empty',
        ],
        {
          cwd: root,
          env: { ...env, PATH: `${bin}:${env.PATH}` },
          encoding: 'utf8',
        },
      );
      assert.equal(noRelease.status, 0, noRelease.stdout + noRelease.stderr);
      assert.match(noRelease.stdout, /No publishable package projects changed/);
      assert.equal(git('rev-parse', 'HEAD'), unchangedHead);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);
