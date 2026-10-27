# Staging read-only deployment (Hostinger)

This branch supports a guarded staging mode. These changes do not affect production unless the environment variable below is enabled.

## Required environment variables

- `STAGING_READ_ONLY=true`
- `NODE_ENV=production`
- `ENABLE_WP_SYNC=false` (legacy integration, pending removal)
- `DB_HOST`, `DB_PORT`, `DB_NAME`: production database connection details
- `DB_USER`, `DB_PASSWORD`: **a dedicated MariaDB user with SELECT privileges only** on the production database. Never reuse the production write-enabled account.

## What the guard does

- Rejects HTTP methods other than GET, HEAD, OPTIONS with HTTP 403.
- Skips CREATE TABLE IF NOT EXISTS on MariaDB initialization.

## Remaining limitations

- This is not a complete sandbox: GET handlers and startup/background tasks may still write to local files or invoke external services.
- Database safety relies on the actual SELECT-only grants of the dedicated DB account, not only the application guard.
- Media files are stored in directories and need independent verification and availability in the staging deployment.
- Do not deploy until background jobs, external integrations, media paths, and build have been checked.
- Do not copy a production .env file into staging.

## Suggested verification before deployment

1. Verify SELECT-only privileges for the staging DB user in Hostinger.
2. Confirm staging environment variables and disable external integrations.
3. Review startup jobs and GET endpoints for side effects.
4. Verify build and images before starting the second Hostinger application.
5. Confirm production remains unchanged.
