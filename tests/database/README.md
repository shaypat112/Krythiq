# Database reliability tests

Run the offline contract tests after changing notification events or migrations:

```sh
node --test tests/database/*.test.mjs
```

Run the production schema check with the project's local environment:

```sh
node --env-file=.env.local tests/database/production-schema-smoke.mjs
```

Run the authenticated notification-preference CRUD check:

```sh
node --env-file=.env.local tests/database/production-crud-smoke.mjs
```

The CRUD test creates a uniquely named temporary Supabase Auth user, tests
create/read/update/delete through PostgREST with that user's access token, and
deletes the temporary user in a `finally` block.

Discover was retired from the application. The forward migration
`20261017010000_retire_discover.sql` revokes client access to its historical
tables, removes them from Realtime, and removes their Storage policies. It
retains historical records, uploaded objects, and shared team functions. Apply
it through the normal database migration process; removing app routes alone
does not revoke direct PostgREST access on an existing database.


## CLI session lifecycle

Apply `20261017020000_cli_session_lifecycle.sql` before rolling out the updated
CLI routes. It adds atomic device claiming, renewable access credentials,
server-owned revocation, and shared lifetime usage totals. Existing credentials
remain usable until revoked. New renewable authorizations expire after 90 days.

Test against a disposable PostgreSQL cluster (requires `initdb`, `pg_ctl`, and
`psql` on PATH):

```sh
npm run test:cli-db
```

The script initializes a temporary cluster, uses a private Unix socket, runs the
base CLI migration and lifecycle migration, checks issuance/expiry/renewal,
revocation, rollback, legacy compatibility, usage totals, and browser grants,
then stops its own cluster. It does not read `.env` or connect to your databases.
The temporary directory retains logs for inspection.

Backend connection integration tests start loopback mock servers:

```sh
npm --prefix backend test
```

These use isolated config directories and synthetic credentials, covering
renewal, HTTP 401 retries, network failure, issuer binding, remote disconnect,
concurrent processes, and browser authorization.

The isolated CLI database suite also exercises retired-workflow cleanup with
existing `ai_token_usages` foreign-key references. Retired action prices are
disabled, preserving historical usages and leaving current prices enabled.
For an existing installation with an unrecorded bootstrap baseline, verify the
live tables before registering `20260718000000` as applied; do not replay the
bootstrap solely to satisfy migration history.

Read-only production CLI verification (empty table queries, synthetic invalid
credential hashes, and anonymous permission checks; no account balance changes):

```sh
node --env-file=.env.local tests/database/production-cli-schema-smoke.mjs
```
