# caliobase

## Documentation

- [Deploying Caliobase-backed sites](docs/deploying-caliobase-backed-sites.md) — app-repo infrastructure pattern for public sites backed by Caliobase, including shared ALB routing, shared Postgres, JWT keypairs, CloudFront behaviors, machine-token handling, and regression coverage.

This project was generated using [Nx](https://nx.dev).

<p style="text-align: center;"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="450"></p>

🔎 **Smart, Fast and Extensible Build System**

## Adding capabilities to your workspace

Nx supports many plugins which add capabilities for developing different types of applications and different tools.

These capabilities include generating applications, libraries, etc as well as the devtools to test, and build projects as well.

Below are our core plugins:

- [React](https://reactjs.org)
  - `npm install --save-dev @nx/react`
- Web (no framework frontends)
  - `npm install --save-dev @nx/web`
- [Angular](https://angular.io)
  - `npm install --save-dev @nrwl/angular`
- [Nest](https://nestjs.com)
  - `npm install --save-dev @nx/nest`
- [Express](https://expressjs.com)
  - `npm install --save-dev @nrwl/express`
- [Node](https://nodejs.org)
  - `npm install --save-dev @nx/node`

There are also many [community plugins](https://nx.dev/community) you could add.

## Generate an application

Run `nx g @nx/react:app my-app` to generate an application.

> You can use any of the plugins above to generate applications as well.

When using Nx, you can create multiple applications and libraries in the same workspace.

## Generate a library

Run `nx g @nx/react:lib my-lib` to generate a library.

> You can also use any of the plugins above to generate libraries as well.

Libraries are shareable across libraries and applications. They can be imported from `@caliobase/mylib`.

## Development server

Run `nx serve my-app` for a dev server. Navigate to http://localhost:4200/. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `nx g @nx/react:component my-component --project=my-app` to generate a new component.

## Build

Run `nx build my-app` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `nx test my-app` to execute the unit tests via [Jest](https://jestjs.io).

Run `nx affected:test` to execute the unit tests affected by a change.

## Running end-to-end tests

Run `nx e2e my-app` to execute the end-to-end tests via [Cypress](https://www.cypress.io).

Run `nx affected:e2e` to execute the end-to-end tests affected by a change.

## Understand your workspace

Run `nx graph` to see a diagram of the dependencies of your projects.

## Further help

Visit the [Nx Documentation](https://nx.dev) to learn more.

## App integration notes

### Public content with machine tokens

When a public or server-rendered app needs Caliobase content, keep machine
tokens on the server side. Treat a Caliobase machine token as an
organization-scoped secret: store it in the app server environment, exchange it
from server code for a short-lived Caliobase bearer JWT, and use that bearer JWT
to call the content API.

Cache that returned Caliobase JWT in the app server, not per browser user or per
incoming request. Reuse the cached JWT for many public-content requests/users
until it is close to the `expiresIn` deadline, then refresh it once and replace
the shared cache entry. This keeps normal public traffic from repeatedly calling
the machine-token exchange endpoint and tripping exchange rate limits.

Do not expose machine tokens or the cached app-server JWT to browser bundles,
static client configuration, or `PUBLIC_*`/`VITE_*`-style environment variables.
Browser code should talk to the app's own loader/API route or receive
already-rendered content.

Prefer the generated OpenAPI client for app integrations instead of hand-written
fetch wrappers. After changing Caliobase controllers/entities, regenerate and
commit the generated client artifacts so downstream apps can consume the updated
API shape directly.

Use `@caliobase/cli <path-to-content-client> command [args...]` for scriptable
access to a downstream app's generated content client. The CLI can list generated
methods, call methods with JSON arguments, log in, and exchange machine tokens.

## ☁ Nx Cloud

### Distributed Computation Caching & Distributed Task Execution

<p style="text-align: center;"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-cloud-card.png"></p>

Nx Cloud pairs with Nx in order to enable you to build and test code more rapidly, by up to 10 times. Even teams that are new to Nx can connect to Nx Cloud and start saving time instantly.

Teams using Nx gain the advantage of building full-stack applications with their preferred framework alongside Nx’s advanced code generation and project dependency graph, plus a unified experience for both frontend and backend developers.

Visit [Nx Cloud](https://nx.app/) to learn more.

## Releases

Caliobase packages are released automatically from `main` by GitHub Actions instead of using a separate release PR.

1. Merge changes to `main`.
2. **Release** runs automatically, restores the previous released versions and internal dependency pins into its checkout, tests/builds the repo, versions changed packages, then publishes any workspace package versions that do not already exist on npm. If no publishable package changed since its latest release tag, the workflow exits successfully without publishing.
3. After publishing succeeds, the same workflow pushes any missing release tags. Release tags are the source of truth for the next automatic version calculation.

Manual **Release** dispatch remains available as an emergency fallback or dry-run smoke test.

Publishing uses npm trusted publishing via GitHub Actions OIDC, so each published package must trust this repository/workflow in npm and no `NPM_TOKEN` secret is required. The release job can publish via OIDC and push release tags, but it does not push version-bump commits directly to `main`.

Source manifests in `main` may therefore contain older versions. Before testing,
building, or calculating a new release, preparation reconstructs each package's
own version and its internal dependency pins from that package's latest release
tag, then refreshes the lockfile. This preserves previously published pins even
when only a dependent package changes in the next release. Intentional source
dependency edits are preserved by comparing against the generated release
commit's source parent; missing provenance needed for reconciliation fails
closed. Unchanged packages are not republished merely to synchronize metadata.
`npm run test:release` verifies sequential releases using the installed Nx
implementation and release-only tags outside main's ancestry.

Local release preparation remains available with `npm run release -- prepare patch`; local publishing can be tested with `npm run release -- publish --dry-run`; local tag backfill can be tested with `npm run release -- tag`.
