# caliobase

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test caliobase` to execute the unit tests via [Jest](https://jestjs.io).

## Running lint

Run `nx lint caliobase` to execute the lint via [ESLint](https://eslint.org/).

## Auth rate limiting

Caliobase applies in-memory rate limits to credential-style auth operations by
default, including password login, OTP requests/login, password reset, social
validation, and machine token exchange. Exceeded limits return HTTP `429`.

Override or disable limits with `authRateLimit`:

```ts
await CaliobaseAuthModule.forRootAsync({
  profileEntities,
  authRateLimit: {
    passwordLogin: { limit: 10, windowMs: 15 * 60 * 1000 },
    machineTokenExchange: { limit: 60, windowMs: 60 * 1000 },
    socialValidate: false,
  },
});
```

Set `authRateLimit: false` to disable all built-in auth rate limits.

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

## Public app content access

For public or server-rendered apps that need Caliobase content, keep the
Caliobase machine token on the app server. Store it as a server-only secret,
exchange it via `POST /machine-auth/exchange`, then use the returned short-lived
Caliobase bearer JWT for content API calls.

Do not ship machine tokens to the browser or expose them through public client
environment variables. Browser code should call the app's own loader/API route
or receive rendered content from server code.

Downstream apps should prefer generated OpenAPI clients for Caliobase calls. If
controller or entity changes affect the API shape, regenerate the client and
commit the generated artifacts rather than maintaining hand-written fetch
wrappers.
