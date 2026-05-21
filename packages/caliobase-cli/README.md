# @caliobase/cli

Generic CLI wrapper for a Caliobase-generated content client.

Use it through the package (`npx @caliobase/cli ...`) or the installed `caliobase` bin.

```bash
npx @caliobase/cli <path-to-content-client> methods
npx @caliobase/cli <path-to-content-client> <namespace.method> [json-arg ...]
npx @caliobase/cli <path-to-content-client> login --email joe@example.com --password '...' --save
npx @caliobase/cli <path-to-content-client> exchange-machine-token --token '...' --save
```

The first positional argument is the generated content client module. It can be a compiled JavaScript module or TypeScript source such as `./libs/content-client/src`.

Environment is loaded from `.env` by default. Useful variables:

- `CALIOBASE_API_BASE_URL`
- `CALIOBASE_ACCESS_TOKEN`
- `CALIOBASE_MACHINE_TOKEN`
- `CALIOBASE_EMAIL`
- `CALIOBASE_PASSWORD`
- `CALIOBASE_ORGANIZATION_ID`

Global options:

- `--env <path>`: env file path (default: `.env`)
- `--base-url <url>`: API origin (default: `CALIOBASE_API_BASE_URL` or `http://localhost:4202`)
- `--no-auth`: do not attach `CALIOBASE_ACCESS_TOKEN`

Generated client arguments are JSON-decoded when possible, so object bodies can be passed as strings:

```bash
npx @caliobase/cli ./libs/content-client/src notes.createNote '{"date":"2026-05-20","body":"hello"}'
```
