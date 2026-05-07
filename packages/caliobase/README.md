# caliobase

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test caliobase` to execute the unit tests via [Jest](https://jestjs.io).

## Running lint

Run `nx lint caliobase` to execute the lint via [ESLint](https://eslint.org/).

## Machine OIDC token exchange

Caliobase can exchange a trusted machine OIDC JWT for a short-lived Caliobase
JWT. Configure trusted issuers on `CaliobaseAuthModule.forRootAsync`:

```ts
await CaliobaseAuthModule.forRootAsync({
  profileEntities,
  machineOidcIssuers: [
    {
      name: 'github-actions',
      issuer: 'https://token.actions.githubusercontent.com',
      audience: 'caliobase-machine-auth',
      subjects: [
        {
          subject: 'repo:justicointeractive/nats2015s:environment:staging',
          userId: 'user_machine_octavius',
          organizationId: 'org_nats2015s',
          name: 'nats2015s staging automation',
        },
      ],
    },
  ],
});
```

Then exchange either a JSON body token or an Authorization bearer token:

```http
POST /machine-auth/oidc/exchange
Authorization: Bearer <trusted-oidc-jwt>
```

The incoming OIDC JWT must match the configured issuer, audience, and exact
subject binding. The response contains a short-lived Caliobase bearer JWT scoped
to the configured `userId` and `organizationId`.
