#!/usr/bin/env bash
# Disposable GitHub Actions Postgres only: never reach Supabase, Vercel, or a remote host.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = "true" || { echo 'CI-only concurrency guard' >&2; exit 2; }
test "${QA_DB_HOST:-}" = "127.0.0.1" || { echo 'Local PostgreSQL only' >&2; exit 3; }
DB_NAME="${1:-go_integration_nextqa}"
[[ "$DB_NAME" =~ ^go_integration_[a-z0-9_]+$ ]] || { echo 'Disposable QA DB required' >&2; exit 4; }
PSQL=(psql -X -h 127.0.0.1 -d "$DB_NAME" -v ON_ERROR_STOP=1 -Atq)
M="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
DRAW_REQUEST="f0000000-0000-4000-8000-000000000001"
"${PSQL[@]}" -c "
INSERT INTO public.go_members(id,nickname,nickname_key,password_hash,recovery_hash)
VALUES('$M','QA동시성','go-stage4-concurrency','qa','qa');
INSERT INTO public.go_coin_wallets(member_id,balance) VALUES('$M',0);
"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
# Each concurrent request uses the exact same idempotency key.
pids=()
for i in $(seq 1 8); do
 "${PSQL[@]}" -c "SELECT public.go_official_draw_v2('$M','$DRAW_REQUEST');" >"$tmp/draw$i" 2>&1 &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
for i in $(seq 1 8); do grep -q '"ok": true' "$tmp/draw$i"; done
"${PSQL[@]}" -c "
DO \$qa\$
BEGIN
 IF (SELECT count(*) FROM public.go_draw_attempts
    WHERE member_id='$M'::uuid AND source_type='free')<>1
 THEN RAISE EXCEPTION '8 concurrent requests generated duplicate free draws'; END IF;
END \$qa\$;
"
# Same completed-battle identity: exactly one first-battle +10C claim.
pids=()
for i in $(seq 1 8); do
 "${PSQL[@]}" -c "SELECT public.go_battle_award_result('$M','random','qa-first-race',true);" >"$tmp/first$i" 2>&1 &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
# Eight distinct additional wins, across both modes, must EACH pay 3C.
pids=()
for i in $(seq 1 8); do
 kind=random
 if (( i % 2 == 0 )); then kind=pvp; fi
 "${PSQL[@]}" -c "SELECT public.go_battle_award_result('$M','$kind','qa-extra-$i',true);" >"$tmp/extra$i" 2>&1 &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
"${PSQL[@]}" -c "
DO \$qa\$
DECLARE v_balance bigint;v_sum bigint;
BEGIN
 SELECT balance INTO v_balance FROM public.go_coin_wallets WHERE member_id='$M'::uuid;
 SELECT coalesce(sum(amount),0) INTO v_sum FROM public.go_coin_transactions WHERE member_id='$M'::uuid;
 IF v_balance<>34 OR v_sum<>34 THEN
  RAISE EXCEPTION 'concurrent award mismatch, balance % ledger %',v_balance,v_sum; END IF;
 IF (SELECT count(*) FROM public.go_battle_reward_claims WHERE member_id='$M'::uuid)<>9 THEN
  RAISE EXCEPTION 'concurrent claim identity duplicated or missing'; END IF;
 IF (SELECT count(*) FROM public.go_coin_transactions
       WHERE member_id='$M'::uuid AND event_type='quest_battle')<>1 THEN
  RAISE EXCEPTION 'daily first-battle reward duplicated'; END IF;
 IF (SELECT count(*) FROM public.go_coin_transactions
       WHERE member_id='$M'::uuid AND event_type='battle_win')<>8 THEN
  RAISE EXCEPTION 'one or more winning awards lost or duplicated'; END IF;
 RAISE NOTICE 'PASS concurrent 8x same free draw, 8x same first battle and 8x different wins, ledger reconciled';
END \$qa\$;
"
