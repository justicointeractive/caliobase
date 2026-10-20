# Test infrastructure

The Test and Release workflows use `docker compose up -d` in this directory.
These services are disposable test dependencies, not production infrastructure.

## MinIO

MinIO's previous public server/client container references and binary archive
URLs are no longer available anonymously. Both `minio` and `init-minio` now use
the same locally built image from `minio/Dockerfile`, containing the real MinIO
server and `mc` client. No third-party S3 emulator or production image is changed.

The build pins and verifies upstream source archives and pins the multi-platform
Go/Alpine bases by digest. Sources:

- Server `RELEASE.2025-10-15T17-29-55Z`, commit
  `9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a`.
- Client `RELEASE.2025-08-13T08-35-41Z`, commit
  `7394ce0dd2a80935aded936b09fa12cbb3cb8096`.

Keep `mc` on the server image's PATH: both Compose and CI use `mc ready local`.
Initialization also needs `/bin/sh`, `mc alias set`, and `mc mb`. The server
retains the original command, root credential variables, `/data` volume, ports,
and `MINIO_DOMAIN=s3.localhost.localstack.cloud`. Caliobase's integration tests
exercise virtual-host S3 addressing and the `caliobase` bucket.

The first build downloads Go modules and compiles both binaries. Subsequent
builds can reuse normal Docker layers. To qualify a source-pin update, build the
image, wait for the healthcheck, initialize the bucket, and run the object-storage
integration tests against a disposable instance.
