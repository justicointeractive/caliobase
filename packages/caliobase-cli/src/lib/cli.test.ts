import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from './cli';

function makeWorkspace() {
  const cwd = mkdtempSync(join(tmpdir(), 'caliobase-cli-'));
  writeFileSync(
    join(cwd, 'content-client.js'),
    `class Api {
      constructor(config = {}) {
        this.config = config;
        this.notes = {
          createNote: (body) => ({ data: { body, baseUrl: this.config.baseUrl, auth: this.config.baseApiParams.headers.Authorization } }),
          getNote: (id) => ({ data: { id } })
        };
        this.auth = {
          loginUser: ({ email, password }) => ({ data: { accessToken: 'user:' + email + ':' + password } })
        };
        this.organization = {
          getRootOrganizationToken: () => ({ data: { accessToken: 'root-token' } }),
          getOrganizationToken: (id) => ({ data: { accessToken: 'org-token:' + id } })
        };
        this.machineAuth = {
          exchangeToken: () => ({ data: { accessToken: this.config.baseApiParams.headers.Authorization.replace('Bearer ', ''), exchanged: true } })
        };
      }
    }
    module.exports = { Api };`,
  );

  return cwd;
}

async function run(argv: string[], cwd = makeWorkspace(), env = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode = await runCli(argv, {
    cwd,
    env,
    stdout: (value) => stdout.push(value),
    stderr: (value) => stderr.push(value),
  });

  return { cwd, stdout, stderr, exitCode };
}

describe('@caliobase/cli', () => {
  it('lists methods from the generated content client', async () => {
    const result = await run(['./content-client', 'methods']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout[0].split('\n')).toEqual([
      'auth.loginUser',
      'machineAuth.exchangeToken',
      'notes.createNote',
      'notes.getNote',
      'organization.getOrganizationToken',
      'organization.getRootOrganizationToken',
    ]);
  });

  it('calls generated client methods with JSON arguments and env auth', async () => {
    const result = await run(
      [
        './content-client',
        'notes.createNote',
        '{"date":"2026-05-20","body":"hello"}',
        '--base-url',
        'https://api.example.test',
      ],
      undefined,
      { CALIOBASE_ACCESS_TOKEN: 'saved-token' },
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout[0])).toEqual({
      body: { date: '2026-05-20', body: 'hello' },
      baseUrl: 'https://api.example.test',
      auth: 'Bearer saved-token',
    });
  });

  it('lets commander parse top-level help without loading a content client', async () => {
    const result = await run(['--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout[0]).toContain('Usage: @caliobase/cli');
    expect(result.stdout[0]).toContain('--base-url <url>');
  });

  it('uses commander parsed env-file and no-auth options', async () => {
    const cwd = makeWorkspace();
    writeFileSync(
      join(cwd, '.caliobase.env'),
      'CALIOBASE_API_BASE_URL=https://env.example.test\nCALIOBASE_ACCESS_TOKEN=saved-token\n',
    );

    const result = await run(
      ['./content-client', 'notes.createNote', '{"body":"hello"}', '--no-auth'],
      cwd,
      { CALIOBASE_ENV_FILE: '.caliobase.env' },
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout[0])).toEqual({
      body: { body: 'hello' },
      baseUrl: 'https://env.example.test',
    });
  });

  it('supports split namespace and method commands', async () => {
    const result = await run(['./content-client', 'notes', 'getNote', 'abc']);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout[0])).toEqual({ id: 'abc' });
  });

  it('logs in and saves the organization access token', async () => {
    const cwd = makeWorkspace();
    const result = await run(
      [
        './content-client',
        'login',
        '--email',
        'joe@example.test',
        '--password',
        'secret',
        '--organization-id',
        'org-1',
        '--save',
      ],
      cwd,
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout[0])).toEqual({
      accessToken: 'org-token:org-1',
      saved: true,
    });
    expect(readFileSync(join(cwd, '.env'), 'utf8')).toContain(
      'CALIOBASE_ACCESS_TOKEN=org-token:org-1',
    );
  });

  it('exchanges machine tokens from the default .env file and saves the resulting access token', async () => {
    const cwd = makeWorkspace();
    writeFileSync(join(cwd, '.env'), 'CALIOBASE_MACHINE_TOKEN=machine-token\n');

    const result = await run(
      ['./content-client', 'exchange-machine-token', '--save'],
      cwd,
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout[0])).toEqual({
      accessToken: 'machine-token',
      exchanged: true,
      saved: true,
    });
    expect(readFileSync(join(cwd, '.env'), 'utf8')).toContain(
      'CALIOBASE_ACCESS_TOKEN=machine-token',
    );
  });

  it('loads TypeScript content clients through tsx', async () => {
    const cwd = makeWorkspace();
    writeFileSync(
      join(cwd, 'content-client.ts'),
      `export class Api {
        health = { check: () => ({ data: { ok: true } }) };
      }`,
    );

    const result = await run(['./content-client.ts', 'health.check'], cwd);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout[0])).toEqual({ ok: true });
  });
});
