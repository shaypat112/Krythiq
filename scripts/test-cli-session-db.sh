#!/bin/bash
set -euo pipefail
task_pg=$(mktemp -d /tmp/krythiq-cli-pg.XXXXXX)
initdb -D "$task_pg/data" -A trust -U postgres > "$task_pg/init.log"
trap 'pg_ctl -D "$task_pg/data" -m fast -w stop > /dev/null 2>&1 || true' EXIT
pg_ctl -D "$task_pg/data" -l "$task_pg/server.log" -o "-k $task_pg -p 55439 -c listen_addresses=''" -w start
psql -h "$task_pg" -p 55439 -U postgres -d postgres -v ON_ERROR_STOP=1 -f tests/database/cli-session-fixture.sql
psql -h "$task_pg" -p 55439 -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/migrations/20260815020000_cli_connections.sql
# Model broad inherited/default grants that may exist on older Supabase projects.
psql -h "$task_pg" -p 55439 -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'grant all on public.cli_access_tokens to public, anon, authenticated'
psql -h "$task_pg" -p 55439 -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/migrations/20261017020000_cli_session_lifecycle.sql
psql -h "$task_pg" -p 55439 -U postgres -d postgres -v ON_ERROR_STOP=1 -f tests/database/cli-session-lifecycle.sql

# Existing paid usage must not block retirement or lose its historical prices.
psql -h "$task_pg" -p 55439 -U postgres -d postgres -v ON_ERROR_STOP=1 -f tests/database/retired-workflow-fixture.sql
psql -h "$task_pg" -p 55439 -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/migrations/20261014000000_remove_retired_workflows.sql
psql -h "$task_pg" -p 55439 -U postgres -d postgres -v ON_ERROR_STOP=1 -f tests/database/retired-workflow-assertions.sql
