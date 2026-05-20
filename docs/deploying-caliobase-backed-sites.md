# Deploying Caliobase-backed sites

This guide captures the deployment pattern we want downstream app repos to use when a public site is backed by a Caliobase CMS/API runtime.

It is based on the AgriAmerica and KidCentral CNY app-repo stacks. The goal is to keep each site cheap, repeatable, and easy to review by sharing infrastructure where it makes sense while keeping app-specific content, secrets, and deploy workflows isolated.

## Recommended shape

A typical app repo should own the public-site stack and wire these pieces together:

- a private S3 bucket for built public-site assets;
- a CloudFront distribution for the public/staging site;
- `/api/*` and `/cms/*` CloudFront behaviors that forward to the Caliobase origin;
- an ECS task/service that runs the app's Caliobase API and CMS static bundle;
- a retained logical database on the shared Postgres instance via `cdk-shared-database`;
- JWT signing keys from `@ji-constructs/ecs-jwt-keypair`;
- shared ALB routing via `@ji-constructs/loadbalanced-ecs-service` rather than a per-site load balancer;
- regression tests that synthesize the stack without AWS calls and prove the shared infrastructure pattern is still in place.

For smaller client/nonprofit sites, do **not** create a dedicated Postgres instance or a dedicated ALB unless there is a specific scale/isolation requirement. Use the shared constructs first.

## Core CDK dependencies

Downstream stacks normally need these packages in their infrastructure app:

```ts
import { EcsJwtKeyPair } from '@ji-constructs/ecs-jwt-keypair';
import { LoadBalancedService } from '@ji-constructs/loadbalanced-ecs-service';
import { SharedDatabaseDatabase } from 'cdk-shared-database';
```

Use AWS CDK primitives around them for the site bucket, CloudFront distribution, ECS cluster/task/service, logging, and WAF as needed.

## Shared database

Use `SharedDatabaseDatabase` to provision a site-specific logical database/user on the shared Postgres instance:

```ts
const databaseName = 'example_site';

const database = new SharedDatabaseDatabase(this, 'ContentDatabase', {
  databaseInstanceName: databaseName,
  sharedDatabase: {
    defaultPort: ec2.Port.tcp(5432),
    instanceIdentifier: 'shareddb-1',
    secret: 'shared/shareddb-1',
    vpc,
    securityGroups: ['sg-0eabf5aaeb0ef6594'],
  },
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});
```

Then pass either the full shared secret as `PG_CONNECTION_JSON` if your Caliobase wrapper expects it, or split the fields into the environment your app uses:

```ts
const apiContainer = taskDefinition.addContainer('ApiContainer', {
  // ...
  environment: {
    POSTGRES_DATABASE: databaseName,
    TYPEORM_SYNCHRONIZE: 'true', // staging bootstrap only; replace with migrations before cutover
  },
  secrets: {
    POSTGRES_HOST: ecs.Secret.fromSecretsManager(database.secret!, 'host'),
    POSTGRES_PORT: ecs.Secret.fromSecretsManager(database.secret!, 'port'),
    POSTGRES_USERNAME: ecs.Secret.fromSecretsManager(database.secret!, 'username'),
    POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(database.secret!, 'password'),
  },
});

database.connections.allowDefaultPortFrom(service);
```

Important defaults:

- Use a unique `databaseInstanceName` per site/environment.
- Retain the logical database by default; content databases should not disappear on stack deletion.
- `TYPEORM_SYNCHRONIZE=true` is acceptable to unblock first staging CMS setup, but production should move to migrations before cutover.
- Tests should assert that the stack creates the shared database custom resource and does not create an app-owned RDS instance.

## JWT keys

Use `@ji-constructs/ecs-jwt-keypair` for Caliobase JWT signing material instead of hand-writing Secrets Manager key generation:

```ts
const jwtKeys = new EcsJwtKeyPair(this, 'JwtKeys', {
  keyName: 'example-site-caliobase-jwt',
});

apiContainer.addEnvironment('PORT', '8080');
apiContainer.addSecret('JWT_PRIVATE_KEY', jwtKeys.ecsSecrets.privateKey);
apiContainer.addSecret('JWT_PUBLIC_KEY', jwtKeys.ecsSecrets.publicKey);
```

Give the key a stable, site-specific `keyName` when you need predictable secret names across deployments. Let the construct handle the private/public key pair and ECS secret wiring.

## Shared ALB routing

Use `@ji-constructs/loadbalanced-ecs-service` to attach the API/CMS service to the shared HTTPS listener:

```ts
const cmsApiOriginHostname = 'example-site-api.justicointeractive.com';
const sharedAlbHttpsListenerArn = 'arn:aws:elasticloadbalancing:us-east-1:435258747813:listener/app/...';

const sharedAlb = new LoadBalancedService(this, 'SharedAlb', {
  listener: sharedAlbHttpsListenerArn,
});

sharedAlb.addTarget('CmsApiTarget', {
  domainName: cmsApiOriginHostname,
  route53ZoneName: 'justicointeractive.com',
  healthCheck: { path: '/api/health' },
  service: cmsApiService as unknown as ecs.Ec2Service,
});

sharedAlb.loadBalancer.connections.allowTo(cmsApiService, ec2.Port.tcp(8080));
```

`LoadBalancedServiceTargetOptions.service` is currently typed as `ecs.Ec2Service`. If the app uses Fargate, either update the construct to accept the common ECS load-balancer target interface or keep the local cast explicit and covered by synth tests. Do not hide the cast in a helper without documenting why it is safe for the target group.

The public CloudFront distribution should treat that hostname as a private-ish origin for app traffic:

```ts
const cmsApiOrigin = new origins.HttpOrigin(cmsApiOriginHostname, {
  protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
});

distribution.addBehavior('/api/*', cmsApiOrigin, {
  allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
  cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
  originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
  responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
  viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
});

distribution.addBehavior('/cms/*', cmsApiOrigin, {
  allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
  cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
  originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
  responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
  viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
});
```

Key lessons:

- Use one stable origin hostname per site/API runtime.
- Forward all viewer data except the Host header so the shared origin sees the ALB/origin host it expects.
- Keep `/api/*` uncached and allow all methods.
- Keep `/cms/*` uncached; GET/HEAD/OPTIONS is usually enough for the CMS shell assets.
- Add a low-cost CloudFront WAF/rate-limit at the site distribution when exposing a staging CMS publicly.

## API/CMS runtime

The ECS task should serve both the API and the CMS shell from one container where possible. That keeps the CloudFront behavior simple: `/api/*` and `/cms/*` both point at the same service.

Recommended container settings:

- listen on `PORT=8080`;
- expose a lightweight `/api/health` endpoint for the shared ALB target group;
- log through `ecs.LogDrivers.awsLogs` with a short, site-specific stream prefix;
- put public config in `environment` and private config in ECS `secrets`;
- set `CMS_HOSTNAME`/front-end URL values explicitly so generated links and CMS same-origin calls are deterministic.

A minimal task wiring looks like this:

```ts
const taskDefinition = new ecs.FargateTaskDefinition(this, 'ApiTaskDefinition', {
  cpu: 512,
  memoryLimitMiB: 1024,
});

const apiContainer = taskDefinition.addContainer('ApiContainer', {
  image: ecs.ContainerImage.fromDockerImageAsset(apiImage),
  environment: {
    NODE_ENV: 'production',
    PORT: '8080',
    POSTGRES_DATABASE: databaseName,
  },
  secrets: {
    POSTGRES_HOST: ecs.Secret.fromSecretsManager(database.secret!, 'host'),
    POSTGRES_PORT: ecs.Secret.fromSecretsManager(database.secret!, 'port'),
    POSTGRES_USERNAME: ecs.Secret.fromSecretsManager(database.secret!, 'username'),
    POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(database.secret!, 'password'),
    JWT_PRIVATE_KEY: jwtKeys.ecsSecrets.privateKey,
    JWT_PUBLIC_KEY: jwtKeys.ecsSecrets.publicKey,
  },
  logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'example-site-api' }),
});

apiContainer.addPortMappings({ containerPort: 8080 });
```

## Public site content access

Public/server-rendered apps should not ship Caliobase machine tokens to the browser.

Use this flow instead:

1. Store the long-lived machine token in a server-only secret such as Secrets Manager.
2. The app server exchanges it with `POST /machine-auth/exchange`.
3. Cache the short-lived Caliobase bearer JWT server-side and reuse it across public content requests until near expiry.
4. Use the generated OpenAPI client to read public page/program/pricing content.
5. Render empty states when no CMS content has been published yet.

Avoid local draft-content fallbacks once a route is supposed to be CMS-managed. They hide integration failures and make staging look healthier than the actual Caliobase-backed production path.

## Regression coverage to add in app repos

Add app-stack tests that prove the deployment pattern, not just a happy synth:

- the stack creates a `Custom::SharedDatabaseDatabase`/shared database resource;
- the stack does not create an app-owned `AWS::RDS::DBInstance` for low-cost sites;
- JWT private/public keys are wired from `@ji-constructs/ecs-jwt-keypair` into ECS secrets;
- the API service is attached to the shared ALB listener/target group;
- CloudFront has `/api/*` and `/cms/*` behaviors pointing at the API origin;
- tests avoid live AWS lookups by using explicit listener/VPC attributes or mocked construct inputs;
- generated OpenAPI clients are regenerated and committed whenever Caliobase controller/entity metadata changes.

For site routes that read content, add tests around the actual integration boundary: no local fallback copy should appear when Caliobase returns an empty published-content set.

## Deployment checklist

Before opening a site-infra PR:

- [ ] Site bucket and CloudFront distribution synth cleanly.
- [ ] `/api/*` and `/cms/*` route through CloudFront to the shared ALB origin.
- [ ] ECS task uses shared Postgres credentials and JWT keypair secrets.
- [ ] The app has a server-only machine-token exchange path for public content reads.
- [ ] Generated content clients are current.
- [ ] Local `check`/synth/build gates pass.
- [ ] PR requests review and has a watcher for CI/review state.

Before production cutover:

- [ ] Replace bootstrap `TYPEORM_SYNCHRONIZE` with migrations.
- [ ] Seed or publish initial CMS content.
- [ ] Verify empty states and unpublished-content behavior deliberately.
- [ ] Confirm WAF/rate limits are appropriate for the public site.
- [ ] Confirm deploy identities are governed from the central repo-governance stack, not hand-created in the app repo.
