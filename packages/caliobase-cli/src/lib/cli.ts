import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import { parse as parseDotenv } from 'dotenv';

type JsonValue = unknown;
type GeneratedClientConstructor = new (config?: Record<string, unknown>) => GeneratedApi;
type GeneratedApi = Record<string, unknown>;
type GeneratedMethod = {
  path: string;
  fn: (...args: JsonValue[]) => Promise<JsonValue> | JsonValue;
};

type CliOptions = {
  envFile: string;
  baseUrl?: string;
  save: boolean;
  noAuth: boolean;
};

type ParsedArgs = {
  contentClientPath?: string;
  command: string[];
  flags: Map<string, string | boolean>;
  options: CliOptions;
};

type CliIO = {
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdout: (value: string) => void;
  stderr: (value: string) => void;
};

const DEFAULT_ENV_FILE = '.env';
const DEFAULT_BASE_URL = 'http://localhost:4202';

export async function runCli(
  argv: string[],
  io: Partial<CliIO> = {},
): Promise<number> {
  const cliIo: CliIO = {
    cwd: io.cwd ?? process.cwd(),
    env: io.env ?? process.env,
    stdout: io.stdout ?? ((value) => console.log(value)),
    stderr: io.stderr ?? ((value) => console.error(value)),
  };

  try {
    const parsed = parseArgs(argv, cliIo.env);
    const [command] = parsed.command;

    if (!parsed.contentClientPath) {
      printHelp(cliIo, parsed);
      return 0;
    }

    const env = loadEnvFile(parsed.options.envFile, cliIo);
    const Api = await loadContentClient(parsed.contentClientPath, cliIo.cwd);

    switch (command) {
      case undefined:
      case 'help':
      case '--help':
      case '-h':
        printHelp(cliIo, parsed, Api);
        return 0;
      case 'methods':
        printGeneratedMethods(cliIo, Api, env, parsed.options);
        return 0;
      case 'login':
        await login(cliIo, parsed, Api, env);
        return 0;
      case 'exchange-machine-token':
      case 'machine-exchange':
        await exchangeMachineToken(cliIo, parsed, Api, env);
        return 0;
      default:
        await callGeneratedClient(cliIo, parsed, Api, env);
        return 0;
    }
  } catch (error) {
    printError(cliIo, error);
    return 1;
  }
}

export function parseArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): ParsedArgs {
  const parser = createArgumentParser(env);
  parser.parse(argv, { from: 'user' });

  const opts = parser.opts<{
    env?: string;
    baseUrl?: string;
    email?: string;
    password?: string;
    organizationId?: string;
    token?: string;
    save?: boolean;
    auth?: boolean;
    help?: boolean;
  }>();
  const rawArgs = parser.args;
  const helpRequested = opts.help === true;
  const [contentClientPath, ...remainingCommand] = rawArgs;
  const flags = optionFlags(opts);
  const envFile = opts.env ?? DEFAULT_ENV_FILE;
  const baseUrl = opts.baseUrl;
  const save = opts.save === true;
  const noAuth = opts.auth === false;

  return {
    contentClientPath,
    command: helpRequested ? ['--help'] : remainingCommand,
    flags,
    options: { envFile, baseUrl, save, noAuth },
  };
}

function createArgumentParser(env: NodeJS.ProcessEnv) {
  return new Command()
    .name('@caliobase/cli')
    .description('Call a generated Caliobase content client')
    .exitOverride()
    .configureOutput({
      writeOut: () => undefined,
      writeErr: () => undefined,
      outputError: () => undefined,
    })
    .helpOption(false)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .argument('[contentClientPath]', 'path to a generated content client')
    .argument('[command...]', 'auth helper, methods, or generated client method')
    .option('--env <path>', 'env file path', env['CALIOBASE_ENV_FILE'] || DEFAULT_ENV_FILE)
    .option('--base-url <url>', 'API origin')
    .option('--email <email>', 'login email')
    .option('--password <password>', 'login password')
    .option('--organization-id <id>', 'organization id for login')
    .option('--token <machine-token>', 'machine token to exchange')
    .option('--save', 'save exchanged or login access token to the env file')
    .option('--no-auth', 'do not attach CALIOBASE_ACCESS_TOKEN')
    .option('-h, --help', 'display help');
}

function optionFlags(opts: {
  env?: string;
  baseUrl?: string;
  email?: string;
  password?: string;
  organizationId?: string;
  token?: string;
  save?: boolean;
  auth?: boolean;
}) {
  const flags = new Map<string, string | boolean>();

  if (opts.env) flags.set('env', opts.env);
  if (opts.baseUrl) flags.set('base-url', opts.baseUrl);
  if (opts.email) flags.set('email', opts.email);
  if (opts.password) flags.set('password', opts.password);
  if (opts.organizationId) flags.set('organization-id', opts.organizationId);
  if (opts.token) flags.set('token', opts.token);
  if (opts.save) flags.set('save', true);
  if (opts.auth === false) flags.set('no-auth', true);

  return flags;
}

function loadEnvFile(envFile: string, io: CliIO): NodeJS.ProcessEnv {
  const path = resolve(io.cwd, envFile);
  if (!existsSync(path)) {
    return { ...io.env };
  }

  return {
    ...io.env,
    ...parseDotenv(readFileSync(path, 'utf8')),
  };
}

async function loadContentClient(
  contentClientPath: string,
  cwd: string,
): Promise<GeneratedClientConstructor> {
  const specifier = resolveContentClientSpecifier(contentClientPath, cwd);
  const requireFromCwd = createRequire(join(cwd, 'package.json'));
  const errors: string[] = [];

  try {
    return getApiConstructor(await nativeImport(specifier), specifier);
  } catch (error) {
    errors.push(`native import: ${errorMessage(error)}`);
  }

  try {
    return getApiConstructor(requireFromCwd(specifier), specifier);
  } catch (error) {
    errors.push(`native require: ${errorMessage(error)}`);
  }

  try {
    const requireFromCli = createRequire(__filename);
    const tsx = requireFromCli('tsx/cjs/api') as {
      require: (id: string, fromFile: string) => unknown;
    };
    return getApiConstructor(
      tsx.require(specifier, join(cwd, 'caliobase-cli.ts')),
      specifier,
    );
  } catch (error) {
    errors.push(`tsx: ${errorMessage(error)}`);
  }

  throw new Error(
    `Unable to load content client '${contentClientPath}'. Tried native import, native require, and tsx TypeScript loading.\n${errors.join('\n')}`,
  );
}

async function nativeImport(specifier: string) {
  const dynamicImport = new Function(
    'specifier',
    'return import(specifier)',
  ) as (specifier: string) => Promise<unknown>;

  return dynamicImport(
    specifier.startsWith('/') ? pathToFileURL(specifier).href : specifier,
  );
}

function resolveContentClientSpecifier(contentClientPath: string, cwd: string) {
  if (!contentClientPath.startsWith('.') && !contentClientPath.startsWith('/')) {
    return contentClientPath;
  }

  const absolute = resolve(cwd, contentClientPath);
  const candidates = [
    absolute,
    `${absolute}.js`,
    `${absolute}.cjs`,
    `${absolute}.mjs`,
    `${absolute}.ts`,
    `${absolute}.tsx`,
    join(absolute, 'index.js'),
    join(absolute, 'index.cjs'),
    join(absolute, 'index.mjs'),
    join(absolute, 'index.ts'),
    join(absolute, 'index.tsx'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? absolute;
}

function getApiConstructor(moduleExports: unknown, specifier: string) {
  const exportsRecord = moduleExports as {
    Api?: unknown;
    default?: unknown;
  };
  const defaultRecord = exportsRecord?.default as { Api?: unknown } | undefined;
  const Api = exportsRecord?.Api ?? defaultRecord?.Api ?? exportsRecord?.default;

  if (typeof Api !== 'function') {
    throw new Error(
      `Content client '${specifier}' must export an Api class or default Api class.`,
    );
  }

  return Api as GeneratedClientConstructor;
}

function createApi(
  Api: GeneratedClientConstructor,
  options: CliOptions,
  env: NodeJS.ProcessEnv,
  token?: string | null,
) {
  const baseUrl = options.baseUrl || env['CALIOBASE_API_BASE_URL'] || DEFAULT_BASE_URL;
  const accessToken =
    token === null
      ? undefined
      : token || (options.noAuth ? undefined : env['CALIOBASE_ACCESS_TOKEN']);

  return new Api({
    baseUrl,
    baseApiParams: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

async function login(
  io: CliIO,
  parsed: ParsedArgs,
  Api: GeneratedClientConstructor,
  env: NodeJS.ProcessEnv,
) {
  const email = stringFlag(parsed, 'email') || env['CALIOBASE_EMAIL'];
  const password = stringFlag(parsed, 'password') || env['CALIOBASE_PASSWORD'];
  const organizationId =
    stringFlag(parsed, 'organization-id') || env['CALIOBASE_ORGANIZATION_ID'];

  if (!email || !password) {
    throw new Error(
      'login requires --email/--password or CALIOBASE_EMAIL/CALIOBASE_PASSWORD in the env file.',
    );
  }

  const api = createApi(Api, parsed.options, env, null);
  const loginResponse = await invokeGeneratedMethod(api, 'auth.loginUser', [
    { email, password },
  ]);
  const userAccessToken = getStringProperty(await unwrapResponse(loginResponse), 'accessToken');

  if (!userAccessToken) {
    throw new Error('Login response did not include accessToken.');
  }

  const memberApi = createApi(Api, parsed.options, env, userAccessToken);
  const memberTokenResponse = organizationId
    ? await invokeGeneratedMethod(memberApi, 'organization.getOrganizationToken', [
        organizationId,
      ])
    : await invokeGeneratedMethod(memberApi, 'organization.getRootOrganizationToken', []);
  const accessToken = getStringProperty(
    await unwrapResponse(memberTokenResponse),
    'accessToken',
  );

  if (!accessToken) {
    throw new Error('Organization token response did not include accessToken.');
  }

  if (parsed.options.save) {
    saveEnvValue(io.cwd, parsed.options.envFile, 'CALIOBASE_ACCESS_TOKEN', accessToken);
  }

  printResult(io, { accessToken, saved: parsed.options.save });
}

async function exchangeMachineToken(
  io: CliIO,
  parsed: ParsedArgs,
  Api: GeneratedClientConstructor,
  env: NodeJS.ProcessEnv,
) {
  const machineToken = stringFlag(parsed, 'token') || env['CALIOBASE_MACHINE_TOKEN'];

  if (!machineToken) {
    throw new Error(
      'exchange-machine-token requires --token or CALIOBASE_MACHINE_TOKEN in the env file.',
    );
  }

  const api = createApi(Api, parsed.options, env, machineToken);
  const response = await invokeGeneratedMethod(api, 'machineAuth.exchangeToken', []);
  const payload = await unwrapResponse(response);
  const accessToken = getStringProperty(payload, 'accessToken');

  if (!accessToken) {
    throw new Error('Machine-token exchange response did not include accessToken.');
  }

  if (parsed.options.save) {
    saveEnvValue(io.cwd, parsed.options.envFile, 'CALIOBASE_ACCESS_TOKEN', accessToken);
  }

  printResult(io, { ...asRecord(payload), saved: parsed.options.save });
}

async function callGeneratedClient(
  io: CliIO,
  parsed: ParsedArgs,
  Api: GeneratedClientConstructor,
  env: NodeJS.ProcessEnv,
) {
  const command =
    parsed.command[0] === 'call' ? parsed.command.slice(1) : parsed.command;
  const api = createApi(Api, parsed.options, env);
  const resolved = resolveGeneratedMethod(api, command);
  const args = resolved.args.map((arg) => parseJsonIfPossible(arg));
  printResult(io, await unwrapResponse(await resolved.method.fn(...args)));
}

function resolveGeneratedMethod(api: GeneratedApi, command: string[]) {
  const methods = getGeneratedMethods(api);
  const [first, second] = command;
  const candidates: { key: string; args: string[] }[] = [];

  if (first?.includes('.')) {
    candidates.push({ key: first, args: command.slice(1) });
  }

  if (first && second) {
    candidates.push({ key: `${first}.${second}`, args: command.slice(2) });
  }

  for (const candidate of candidates) {
    const method = methods.get(candidate.key);
    if (method) return { method, args: candidate.args };
  }

  const attempted = command.length ? command.join(' ') : '(none)';
  throw new Error(
    `Generated method not found: ${attempted}. Run \`@caliobase/cli <path-to-content-client> methods\` to see available methods.`,
  );
}

function invokeGeneratedMethod(
  api: GeneratedApi,
  path: string,
  args: JsonValue[],
): Promise<JsonValue> | JsonValue {
  const method = getGeneratedMethods(api).get(path);
  if (!method) {
    throw new Error(`Generated client does not expose ${path}.`);
  }

  return method.fn(...args);
}

function getGeneratedMethods(api: GeneratedApi) {
  const methods = new Map<string, GeneratedMethod>();

  for (const [namespace, value] of Object.entries(api)) {
    if (!value || typeof value !== 'object') continue;

    for (const [method, fn] of Object.entries(value as Record<string, unknown>)) {
      if (typeof fn !== 'function') continue;
      const path = `${namespace}.${method}`;
      methods.set(path, { path, fn: fn as GeneratedMethod['fn'] });
    }
  }

  return methods;
}

function printGeneratedMethods(
  io: CliIO,
  Api: GeneratedClientConstructor,
  env: NodeJS.ProcessEnv,
  options: CliOptions,
) {
  io.stdout([...getGeneratedMethods(createApi(Api, options, env)).keys()].sort().join('\n'));
}

function printHelp(
  io: CliIO,
  parsed: ParsedArgs,
  Api?: GeneratedClientConstructor,
) {
  const exampleMethods = Api
    ? [...getGeneratedMethods(createApi(Api, parsed.options, io.env)).keys()]
        .sort()
        .slice(0, 5)
        .map((method) => `  @caliobase/cli ${parsed.contentClientPath} ${method}`)
        .join('\n')
    : '  @caliobase/cli ./libs/content-client/src methods';

  io.stdout(`Usage: @caliobase/cli <path-to-content-client> <command> [args...] [options]

Environment is loaded from .env by default.

Global options:
  --env <path>              Env file path (default: .env)
  --base-url <url>          API origin (default: CALIOBASE_API_BASE_URL or ${DEFAULT_BASE_URL})
  --no-auth                 Do not attach CALIOBASE_ACCESS_TOKEN

Auth helpers:
  login --email <email> --password <password> [--organization-id <id>] [--save]
  exchange-machine-token --token <machine-token> [--save]

Generated client commands:
  methods                   List methods inferred from the generated content client
  <namespace.method> [json-arg ...]
  <namespace> <method> [json-arg ...]
  call <namespace.method> [json-arg ...]

Examples:
${exampleMethods}
`);
}

function printResult(io: CliIO, value: JsonValue) {
  if (typeof value === 'string') {
    io.stdout(value);
    return;
  }

  io.stdout(JSON.stringify(value, null, 2));
}

async function unwrapResponse(value: JsonValue): Promise<JsonValue> {
  if (value && typeof value === 'object') {
    const maybeResponse = value as Response & {
      data?: unknown;
      error?: unknown;
    };
    if ('data' in maybeResponse && maybeResponse.data !== null) {
      return maybeResponse.data;
    }

    if (typeof maybeResponse.text === 'function') {
      const text = await maybeResponse.text();
      if (!text) return { ok: maybeResponse.ok, status: maybeResponse.status };
      return parseJsonIfPossible(text);
    }
  }

  return value;
}

function parseJsonIfPossible(value: string): JsonValue {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function stringFlag(parsed: ParsedArgs, name: string) {
  const value = parsed.flags.get(name);
  return typeof value === 'string' ? value : undefined;
}

function getStringProperty(value: JsonValue, key: string) {
  return value && typeof value === 'object' && key in value
    ? String((value as Record<string, unknown>)[key])
    : undefined;
}

function asRecord(value: JsonValue) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { value };
}

function saveEnvValue(cwd: string, envFile: string, key: string, value: string) {
  const path = resolve(cwd, envFile);
  const lines = existsSync(path) ? readFileSync(path, 'utf8').split(/\r?\n/) : [];
  let replaced = false;
  const next = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      replaced = true;
      return `${key}=${quoteEnv(value)}`;
    }
    return line;
  });

  if (!replaced) {
    if (next.length && next[next.length - 1] !== '') next.push('');
    next.push(`${key}=${quoteEnv(value)}`);
  }

  writeFileSync(path, `${next.join('\n').replace(/\n+$/, '')}\n`);
}

function quoteEnv(value: string) {
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function printError(io: CliIO, error: unknown) {
  const response = error as {
    error?: unknown;
    status?: number;
    statusText?: string;
  };
  if (response?.error) {
    io.stderr(JSON.stringify(response.error, null, 2));
    return;
  }

  if (response?.status) {
    io.stderr(`${response.status} ${response.statusText || ''}`.trim());
    return;
  }

  io.stderr(error instanceof Error ? error.message : String(error));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
