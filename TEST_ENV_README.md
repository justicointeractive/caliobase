# Test Environment Files

This directory contains `.env.test` files that are safe to check into version control for CI/testing purposes.

## Security Considerations

- **Real secrets removed**: The `FACEBOOK_APP_SECRET` has been intentionally omitted from test files as it's the only real secret that needs protection.
- **Test-only values**: JWT keys, AWS credentials, and database connection strings use test/mock values only.
- **Safe for CI**: These files can be safely used in continuous integration environments.

## Files Created

- `/.env.test` - Root level test environment variables
- `/packages/caliobase/.env.test` - Package-specific test variables
- `/examples/.env.test` - Example applications test variables

## Usage in CI

Your CI system can copy these test files to the appropriate `.env` locations:

```bash
# Copy test environment files for CI
cp .env.test .env
cp packages/caliobase/.env.test packages/caliobase/.env
cp examples/.env.test examples/.env
```

## Local Development

For local development, continue using the existing `.env` files (which remain gitignored) with your actual secrets and local database configurations.

## Adding New Environment Variables

When adding new environment variables:

1. Add them to the appropriate `.env` file for local development
2. Add safe/mock versions to the corresponding `.env.test` files
3. Ensure sensitive values are never committed to the test files

## Environment Variables Included

### Database Configuration
- `PG_CONNECTION_STRING` - PostgreSQL connection for testing
- `MYSQL_CONNECTION_STRING` - MySQL connection for testing

### Authentication
- `JWT_PRIVATE_KEY` - Test JWT private key (not for production)
- `JWT_PUBLIC_KEY` - Test JWT public key (not for production)
- `FACEBOOK_APP_ID` - Test Facebook app ID

### AWS/S3 Configuration
- `AWS_REGION` - Test AWS region
- `AWS_ACCESS_KEY_ID` - Mock AWS access key
- `AWS_SECRET_ACCESS_KEY` - Mock AWS secret key
- `S3_BUCKET` - Test S3 bucket name
- `S3_ENDPOINT` - Local S3-compatible endpoint
- `STATIC_FILE_BASEURL` - Test static file base URL

### Application Settings
- `NODE_ENV` - Set to 'test'
- `PORT` - Application port for testing
- `TYPEORM_LOGGING` - Database logging configuration
