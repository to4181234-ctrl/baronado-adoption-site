#!/usr/bin/env bash
set -euo pipefail
# Runs against GitHub Actions' disposable Postgres service, never production.
member='44444444-4444-4444-8444-444444444444'
dogs=(
  '55555555-5555-4555-8555-555555555555'
  '66666666-6666-4666-8666-666666666666'
  '77777777-7777-4777-8777-777777777777'
)
psql -v ON_ERROR_STOP=1 <<SQL
INSERT INTO public.go_members(id) VALUES ('$member');
INSERT INTO public.dogs(id,category) VALUES
 ('${dogs[0]}','adoption'),('${dogs[1]}','adoption'),('${dogs[2]}','adoption');
INSERT INTO public.go_cards(member_id,dog_id,status)
SELECT '$member',id,'approved' FROM public.dogs WHERE id IN
 ('${dogs[0]}','${dogs[1]}','${dogs[2]}');
SQL

pids=()
for dog in "${dogs[@]}"; do
  for action in snack praise play; do
    psql -v ON_ERROR_STOP=1 -qtAX \
      -c "SELECT public.go_do_rewarded_interaction('$member'::uuid,'$dog'::uuid,'$action');" \
      >/dev/null &
    pids+=("$!")
  done
done
for pid in "${pids[@]}"; do wait "$pid"; done

actual="$(psql -v ON_ERROR_STOP=1 -qtAX -c "
SELECT w.balance::text || ':' ||
 (SELECT count(*) FROM public.go_coin_transactions t
  WHERE t.member_id=w.member_id AND t.event_type='care')::text || ':' ||
 (SELECT count(*) FROM public.go_coin_transactions t
  WHERE t.member_id=w.member_id AND t.event_type='quest_care')::text || ':' ||
 (SELECT count(*) FROM public.go_interactions i
  WHERE i.member_id=w.member_id)::text
FROM public.go_coin_wallets w WHERE w.member_id='$member';")"
if [[ "$actual" != '60:5:1:9' ]]; then
 echo "Concurrency mismatch: expected 60:5:1:9, received $actual" >&2
 exit 1
fi
echo "Concurrency test passed: 9 valid simultaneous actions, only 5 paid care actions."
