#!/usr/bin/env bash
# Only local, disposable, synthetic PostgreSQL. NEVER point at Supabase production.
set -euo pipefail
DB_NAME="${1:-go_integration_final}"
if [[ ! "$DB_NAME" =~ ^go_integration_[a-z0-9_]+$ ]]; then
 echo "BLOCKED: expected disposable go_integration_* database" >&2; exit 3
fi
# Force the local socket so a Supabase production URL can never be consulted.
PSQL=(psql -X -h /var/run/postgresql -d "$DB_NAME" -v ON_ERROR_STOP=1 -q)
SERVER="$("${PSQL[@]}" -Atqc "SELECT coalesce(inet_server_addr()::text, 'local')")"
if [[ "$SERVER" != "local" ]]; then echo "BLOCKED nonlocal DB: $SERVER" >&2; exit 4; fi
echo "QA database: $DB_NAME (local socket, synthetic records)"
"${PSQL[@]}" -f tests/fixtures/go-integration-schema.sql
"${PSQL[@]}" -f tests/fixtures/go-integration-seed.sql
for pass in first second; do
  for stage in 2 3 4 5; do
    f="$(find docs/sql -maxdepth 1 -name "stage${stage}-*DRAFT.sql" -print -quit)"
    test -n "$f"
    echo "Migration $pass: stage $stage"
    "${PSQL[@]}" -f "$f"
  done
done
"${PSQL[@]}" -f tests/fixtures/go-integration-assert.sql
echo "PASS: source-correct 2→5 migration twice, original data preserved, cross-feature SQL flows"
