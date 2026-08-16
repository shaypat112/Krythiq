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
