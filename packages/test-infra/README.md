# Test infrastructure

The Test and Release workflows use `docker compose up -d` in this directory.
These services are disposable test dependencies, not production infrastructure.

## RustFS object storage

S3 integration tests use the official RustFS **1.0.3** image, pinned by its
multi-platform digest. Bucket initialization uses the official AWS CLI **2.31.16**
image, also pinned by digest. No MinIO image, client, or source build is required.

RustFS runs as its image's default non-root user (UID 10001), with a separate
named `rustfs` volume mounted at `/data`. Docker initializes that volume from the
image's writable data directory. No existing MinIO volume is reused or migrated.

The API remains at port 9000 and the console at 9001. Explicit test-only
credentials match the package `.env.test` files. `RUSTFS_SERVER_DOMAINS` keeps
virtual-host S3 addressing at `s3.localhost.localstack.cloud`, so existing AWS SDK
endpoints and presigned part URLs remain unchanged. Tests do not force path-style
addressing to hide compatibility problems.

After Compose starts, run:

```sh
bash ./wait-object-storage.sh
```

Both CI workflows use this helper. It waits for RustFS `/health` and requires the
bucket initializer to exit successfully, avoiding a race between HTTP readiness
and creation of the `caliobase` bucket. Initialization is idempotent: authenticated
`HeadBucket` succeeds for an existing bucket, otherwise `CreateBucket` must
succeed. Failures are not ignored.

For an image-pin update, verify Compose configuration, readiness and bucket
initialization, then run the object-storage integration and cancellation suites.
The real S3 tests cover virtual-host multipart upload, content download, existence
checks, deletion, and explicit multipart-abort cleanup. Mocked-boundary tests
exercise deadline propagation and cancellation ordering separately.
