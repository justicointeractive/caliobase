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

Reviewed package manifests and `package-lock.json` on `main` are authoritative.
**Include version bumps in the feature PR**, not in a separate release PR or an
unreviewed CI commit. Tags mark releases; they never reconstruct version state.

1. Bump every changed public package, including consumers whose dependency pins
   change. A shared root dependency/devDependency, TypeScript or Babel config
   change (including non-workspace lockfile changes) conservatively requires bumps
   for all public packages.
2. The existing Nx helper can prepare these edits locally without committing or
   tagging: `npx nx release version patch --projects=caliobase --git-commit=false --git-tag=false`.
   Review the affected consumer versions/pins, then run
   `npm install --package-lock-only --ignore-scripts` and commit the manifests and lock.
3. Run `npm run release -- check --base=origin/main`. CI repeats this against the
   PR base and rejects unchanged/decreasing/invalid versions for changed packages,
   mismatched workspace ranges/lock entries, and proposed versions already on npm
   or behind published versions. Test/readme changes inside a package also require
   a bump; release-tooling/root-doc-only changes do not. Release checks never edit
   files or create commits/tags. A passing check cannot infer whether a breaking
   API change deserves a major bump: that remains a review responsibility.
4. After merge, **Release** tests and publishes only missing versions directly
   from the committed manifests, using npm trusted publishing/OIDC. Builds must
   preserve reviewed versions and internal pins. Stable packages use `latest`;
   prereleases use `next`. Registry errors fail closed rather than meaning missing.
5. After all packages are published, push missing tags for versions introduced by
   that merge at its exact commit.
   Already-published versions are skipped on retry; versions introduced by the
   current merge must report that exact commit as npm `gitHead`, otherwise fail
   as an immutable collision (source provenance, not bit-reproducible-build proof).
   Missing tags can be retried
   by rerunning that original release workflow, without recalculating or
   incrementing any version. A later unrelated merge does not guess/backfill
   older missing markers at its newer commit. No direct-main version push.

Manual **Release** dispatch runs only from `main`, defaults to a non-publishing
smoke test and accepts no version specifier. Local smoke:
`npm run release -- publish --dry-run`; tag preview:
`npm run release -- tag --dry-run` (requires the versions to be published).

The initial transition restores a consistent reviewed baseline using fresh patch
versions above npm's published versions, including updated internal pins. This is
an explicit one-time edit in this PR, not recurring registry/tag reconstruction.
`npm run test:release` covers missing bumps, dependency/lock drift, sequential
subset releases, read-only checks and publication retry/failure behavior.
