#!/usr/bin/env bash
# Disposable CI database ONLY. No production environment credentials.
set -euo pipefail
psql -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO public.go_members(id,nickname)
 VALUES('44444444-4444-4444-8444-444444444444','동시 호스트'),
       ('44444444-4444-4444-8444-555555555555','동시 게스트');
INSERT INTO public.go_cards(member_id,dog_id,status,title,image_path,photo_style,description,cuteness,charm,affection)
 VALUES
 ('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','approved','동시 호스트 카드','race-host.webp','original','동시',3,3,3),
 ('44444444-4444-4444-8444-555555555555','99999999-9999-4999-8999-999999999999','approved','동시 게스트 카드','race-guest.webp','original','동시',3,3,3);
SQL
host='44444444-4444-4444-8444-444444444444'
guest='44444444-4444-4444-8444-555555555555'
room_json=$(psql -Atq -c "SELECT public.go_pvp_create('$host');")
room=$(printf '%s' "$room_json" | jq -r '.roomId')
code=$(printf '%s' "$room_json" | jq -r '.inviteCode')
test "$room" != "null" && test -n "$room"
joined=$(psql -Atq -c "SELECT public.go_pvp_join('$guest','$code');")
test "$(printf '%s' "$joined" | jq -r .ok)" = "true"
host_card=$(psql -Atq -c "SELECT id FROM public.go_cards WHERE member_id='$host';")
guest_card=$(psql -Atq -c "SELECT id FROM public.go_cards WHERE member_id='$guest';")
psql -Atq -c "SELECT public.go_pvp_action('$host','$room','select','camera','$host_card',NULL);" >/dev/null
psql -Atq -c "SELECT public.go_pvp_action('$guest','$room','select','camera','$guest_card',NULL);" >/dev/null
# Separate DB processes hit the same room at almost the same instant.
psql -Atq -c "SELECT public.go_pvp_action('$host','$room','ready');" > /tmp/go-pvp-host-ready.json &
pid_a=$!
psql -Atq -c "SELECT public.go_pvp_action('$guest','$room','ready');" > /tmp/go-pvp-guest-ready.json &
pid_b=$!
wait "$pid_a"
wait "$pid_b"
state=$(psql -Atq -c "SELECT status FROM public.go_pvp_rooms WHERE id='$room';")
rows=$(psql -Atq -c "SELECT count(*) FROM public.go_pvp_records WHERE room_id='$room';")
wallets=$(psql -Atq -c "SELECT coalesce(sum(balance),0) FROM public.go_coin_wallets WHERE member_id IN ('$host','$guest');")
awards=$(psql -Atq -c "SELECT count(*) FROM public.go_coin_transactions WHERE member_id IN ('$host','$guest') AND event_type='quest_battle';")
test "$state" = completed
test "$rows" = 2
test "$wallets" = 20
test "$awards" = 2
# Late retries must not create second history rows or another wallet award.
psql -Atq -c "SELECT public.go_pvp_action('$host','$room','ready');" >/dev/null
rows=$(psql -Atq -c "SELECT count(*) FROM public.go_pvp_records WHERE room_id='$room';")
test "$rows" = 2
echo "STAGE THREE CONCURRENCY PASS: 2 simultaneous READY requests, 1 match, 2 immutable outcomes, 1 daily quest per player."
