-- READ ONLY. Optional preflight for the authorized operator before any later rollout.
-- This task did not execute this file against production.
BEGIN TRANSACTION READ ONLY;
-- Source SQL defaults and all active cleanup triggers must be compared with the target.
SELECT c.relname AS table_name,t.tgname,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
WHERE NOT t.tgisinternal AND c.relnamespace='public'::regnamespace
 AND c.relname IN ('go_cards','go_official_owned','go_official_hidden','go_pvp_records','go_battles')
ORDER BY c.relname,t.tgname;
-- Do not guess dog identity where the immutable snapshot is missing or malformed.
SELECT count(*) AS total_records,
 count(*) FILTER(WHERE d.id IS NOT NULL) AS identifiable_existing_dog,
 count(*) FILTER(WHERE d.id IS NULL) AS needs_historical_audit
FROM public.go_pvp_records p
LEFT JOIN public.go_pvp_rooms r ON r.id=p.room_id
LEFT JOIN public.go_pvp_rounds rd ON rd.room_id=p.room_id AND rd.round_number=p.round_number
LEFT JOIN public.dogs d ON d.id::text=lower(CASE WHEN p.member_id=r.host_id THEN rd.host_card->>'dogId'
 WHEN p.member_id=r.guest_id THEN rd.guest_card->>'dogId' END);
-- Historical random matches can only be attributed to an owner while the recorded card is provable.
SELECT count(*) AS total_receipts,
 count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM public.go_cards c WHERE c.member_id=b.member_id
 AND ((c.id=b.first_card_id AND c.dog_id=b.first_dog_id) OR (c.id=b.second_card_id AND c.dog_id=b.second_dog_id)))) AS unprovable_owner_history
FROM public.go_battles b;
ROLLBACK;
