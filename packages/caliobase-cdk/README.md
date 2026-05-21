# caliobase-cdk

For downstream app-repo infrastructure guidance, see [Deploying Caliobase-backed sites](../../docs/deploying-caliobase-backed-sites.md). It covers shared ALB routing with `@ji-constructs/loadbalanced-ecs-service`, JWT keypair wiring with `@ji-constructs/ecs-jwt-keypair`, shared Postgres via `cdk-shared-database`, CloudFront `/api` + `/cms` behaviors, and app-stack regression coverage.

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test caliobase-cdk` to execute the unit tests via [Jest](https://jestjs.io).

## Running lint

Run `nx lint caliobase-cdk` to execute the lint via [ESLint](https://eslint.org/).
