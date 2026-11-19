#!/usr/bin/env bash
# Read-only HTTP smoke checks against the disposable Next.js server on loopback.
# Never targets a Vercel deployment or an external Supabase instance.
set -euo pipefail
HOST='127.0.0.1'
PORT='3097'
log="$(mktemp)"
./node_modules/.bin/next start -H "$HOST" -p "$PORT" >"$log" 2>&1 &
server_pid=$!
cleanup() { kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; rm -f "$log";}
trap cleanup EXIT
ready=0
for attempt in $(seq 1 45); do
  if curl --noproxy '*' -fsS "http://$HOST:$PORT/go" -o /dev/null 2>/dev/null; then ready=1; break; fi
  if ! kill -0 "$server_pid" 2>/dev/null; then break; fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
 echo 'Local Next.js did not start successfully'; tail -80 "$log"; exit 1
fi
for path in /go /go/quests /go/battle '/go/battle?mode=random' '/go/battle?mode=friend' /admin/go/visit /admin/go /admin/go/stats /admin/dogs /admin/analytics; do
 status="$(curl --noproxy '*' --silent --output /dev/null --write-out '%{http_code}' "http://$HOST:$PORT$path")"
 if [ "$status" != 200 ]; then
  echo "HTTP smoke failed: $path returned $status"; tail -60 "$log"; exit 1
 fi
 echo "HTTP 200 $path"
done
