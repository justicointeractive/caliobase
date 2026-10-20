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

Cache the returned bearer JWT server-side and share that cache entry across
public-content requests/users. Do not exchange the machine token per browser
visitor or per request; reuse the cached JWT until it is close to its `expiresIn`
deadline, refresh it once, and replace the shared cache entry. This avoids
turning public traffic into machine-token exchange traffic and hitting exchange
rate limits.

Do not ship machine tokens or the cached app-server JWT to the browser or expose
them through public client environment variables. Browser code should call the
app's own loader/API route or receive rendered content from server code.

Downstream apps should prefer generated OpenAPI clients for Caliobase calls. If
controller or entity changes affect the API shape, regenerate the client and
commit the generated artifacts rather than maintaining hand-written fetch
wrappers.

## Cancellable server-side object storage

`ObjectStorageOperationOptions` adds optional `signal` and `requestTimeoutMs`
(positive integer milliseconds) to storage creation, completion, source downloads,
and signed-URL refresh. `uploadFileFromUrl` accepts these fields on its request:

```ts
const job = new AbortController();
const deadline = setTimeout(() => job.abort(), 5 * 60_000);
try {
  await storage.uploadFileFromUrl({
    source: new URL('https://example.com/audio.mp3'),
    fileName: 'audio.mp3',
    organization: { id: organizationId },
    signal: job.signal,
    requestTimeoutMs: 30_000,
  });
} finally {
  clearTimeout(deadline);
}
```

Existing callers and custom providers remain source-compatible. Custom providers
must implement signal handling themselves; `abortUpload` is optional for providers
without multipart uploads. The S3 provider passes cancellation to SDK requests.
HTTP deadlines cover source bodies and part uploads, and failures cancel unused
response bodies. There is no detached-work timeout race: database operations,
local signing, and credential providers without cancellation are awaited and
checked before subsequent work, so a deadline can be exceeded while they settle.

On an incomplete multipart failure, cleanup is awaited with an independent
non-aborted deadline (`requestTimeoutMs`, or 30 seconds when omitted). Errors carry
`objectStorage` recovery identifiers and an optional `cleanupError`; cleanup does
not replace the initiating failure. Pending records are retained for recovery.
Known committed completions are never rolled back: cancellation or a database
failure after S3 completion sets `objectStorage.committed`. Interrupted remote
requests can have ambiguous outcomes, so callers must reconcile identifiers
rather than blindly deleting objects. This API does not implement automatic
reconciliation or exactly-once uploads.
