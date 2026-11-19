#!/usr/bin/env bash
# Only local, disposable, synthetic PostgreSQL. NEVER point at Supabase production.
set -euo pipefail
DB_NAME="${1:-go_integration_final}"
if [[ ! "$DB_NAME" =~ ^go_integration_[a-z0-9_]+$ ]]; then
 echo "BLOCKED: expected disposable go_integration_* database" >&2; exit 3
fi
# Allow only a local socket or loopback TCP to a disposable PostgreSQL server.
# Explicitly do NOT honor DATABASE_URL or any production Supabase connection string.
QA_DB_HOST="${QA_DB_HOST:-/var/run/postgresql}"
case "$QA_DB_HOST" in
  /var/run/postgresql|localhost|127.0.0.1|::1) ;;
  *) echo "BLOCKED nonlocal DB host: $QA_DB_HOST" >&2; exit 4 ;;
esac
PSQL=(psql -X -h "$QA_DB_HOST" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q)
SERVER="$("${PSQL[@]}" -Atqc "SELECT coalesce(inet_server_addr()::text, 'local')")"
case "$SERVER" in
  local|127.0.0.1|::1) ;;
  *) echo "BLOCKED nonlocal resolved DB: $SERVER" >&2; exit 5 ;;
esac
echo "QA database: $DB_NAME (local socket, synthetic records)"
"${PSQL[@]}" -f tests/fixtures/go-integration-schema.sql
"${PSQL[@]}" -f tests/fixtures/go-integration-seed.sql
"${PSQL[@]}" -f tests/fixtures/go-integration-baseline-rpc.sql
for pass in first second; do
  for stage in 2 3 4 5; do
    f="$(find docs/sql -maxdepth 1 -name "stage${stage}-*DRAFT.sql" -print -quit)"
    test -n "$f"
    echo "Migration $pass: stage $stage"
    "${PSQL[@]}" -f "$f"
  done
done
# The 2026-11-18 bug fixes are *not* part of stage2..5: run their drafts
# twice too, so CI catches missing columns, non-idempotent statements,
# and accidentally reverting the first-care reward to 20C.
for pass in first second; do
  for migration in \
    docs/sql/predeploy-hidden-stats-pvp-DRAFT.sql \
    docs/sql/predeploy-random-official-battle-DRAFT.sql \
    docs/sql/quest-care-10-total-DRAFT.sql \
    docs/sql/predeploy-care-no-card-DRAFT.sql \
    docs/restoration/stage3-last-card-pvp-DRAFT.sql; do
    echo "Predeploy migration $pass: $migration"
    "${PSQL[@]}" -f "$migration"
  done
done
"${PSQL[@]}" -f tests/fixtures/go-integration-assert.sql
echo "PASS: source-correct 2→5 migration twice, original data preserved, cross-feature SQL flows"

# 2026-11-19 release gate is tested *after* the baseline integration flows,
# preserving the legacy fixture expectations before publication enforcement.
for pass in first second; do
  for migration in \
    docs/sql/meonggo-dog-release-gate-20261119-DRAFT.sql \
    docs/sql/meonggo-release-filtered-rpcs-20261119-DRAFT.sql \
    docs/sql/official-card-bulk-delete-20261119-DRAFT.sql; do
    echo "Dog-content-release migration $pass: $migration"
    "${PSQL[@]}" -f "$migration"
  done
done
"${PSQL[@]}" -f tests/fixtures/go-release-gate-assert.sql
echo "PASS: full 4+1 official + 2 pixel artwork release-gate, idempotent migrations and owner bulk deletion"
