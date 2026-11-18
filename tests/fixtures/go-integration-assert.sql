-- SYNTHETIC TEST DATA ONLY; no production records or credentials.
DO $integration$
DECLARE
 a uuid:='11111111-1111-4111-8111-111111111111';
 b uuid:='22222222-2222-4222-8222-222222222222';
 da uuid:='33333333-3333-4333-8333-333333333333';
 db uuid:='44444444-4444-4444-8444-444444444444';
 ca uuid:='55555555-5555-4555-8555-555555555555';
 cb uuid:='66666666-6666-4666-8666-666666666666';
 r jsonb;receipt jsonb;rid uuid;code text;paid bigint;
BEGIN
 IF (SELECT count(*) FROM public.go_cards)<>2 OR
    (SELECT count(*) FROM public.go_coin_transactions WHERE source_key='qa:historic:one')<>1
    OR (SELECT count(*) FROM public.go_members)<>2
 THEN RAISE EXCEPTION 'Migration lost prior data'; END IF;

 -- Real new 4+1 official assets, with already-published 1..4 preserved.
 INSERT INTO public.go_official_assets(version_id,slot,title,original_path,display_path)
 VALUES('77777777-7777-4777-8777-777777777777',5,'','qa/hiddenA','qa/hiddenDispA'),
 ('88888888-8888-4888-8888-888888888888',5,'','qa/hiddenB','qa/hiddenDispB');

 -- Stage3 care: existing personal card remains eligible and atomically rewarded.
 r:=public.go_do_rewarded_interaction(a,da,'praise');
 IF COALESCE((r->>'ok')::boolean,false)<>true OR (r->>'coinsAdded')::int<>10 THEN
  RAISE EXCEPTION 'stage3 care + coins failed %',r; END IF;

 -- The quest and first care are one 10C receipt, NEVER 10C+10C.
 IF (SELECT count(*) FROM public.go_coin_transactions WHERE member_id=a
       AND local_day=(now() AT TIME ZONE 'Asia/Seoul')::date
       AND event_type IN ('care','quest_care'))<>1 THEN
  RAISE EXCEPTION 'first-care reward double counted'; END IF;
 r:=public.go_do_rewarded_interaction(a,da,'snack');
 IF r->>'ok'<>'true' OR (r->>'coinsAdded')::int<>10 THEN
  RAISE EXCEPTION 'second care reward should be 10C %',r; END IF;
 IF (SELECT count(*) FROM public.go_coin_transactions WHERE member_id=a
       AND local_day=(now() AT TIME ZONE 'Asia/Seoul')::date
       AND event_type='quest_care')<>1 THEN
  RAISE EXCEPTION 'quest care granted more than once'; END IF;

 -- Stage2 official daily free card (other member), 4+1 slots.
 r:=public.go_official_draw(b);
 IF r->>'ok'<>'true' OR NOT (r->>'slot')::int BETWEEN 1 AND 4 THEN
  RAISE EXCEPTION 'stage2 free draw invalid %',r; END IF;
 IF EXISTS(SELECT 1 FROM public.go_official_hidden) THEN RAISE EXCEPTION 'Hidden auto-unlocked'; END IF;

 -- Stage4 targeted choice is DOG only, not exact card; 300C.
 r:=public.go_store_purchase(a,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','specific',da,NULL);
 IF r->>'ok'<>'true' OR (r->>'coinsSpent')::int<>300 OR (r->>'dogId')::uuid<>da
 THEN RAISE EXCEPTION 'stage4 dog-specific 300C failed %',r; END IF;
 receipt:=r;
 r:=public.go_store_purchase(a,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','specific',da,NULL);
 IF r->>'ok'<>'true' OR (r->>'coinsSpent')::int<>0 OR r->>'slot'<>receipt->>'slot'
 THEN RAISE EXCEPTION 'stage4 duplicate transaction doublecharged %',r; END IF;
 r:=public.go_store_purchase(a,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','specific',da,2::smallint);
 IF r->>'ok'<>'false' THEN RAISE EXCEPTION 'allowed exact-card targeting %',r; END IF;
 r:=public.go_store_purchase(a,'cccccccc-cccc-4ccc-8ccc-cccccccccccc','random',NULL,NULL);
 IF r->>'ok'<>'true' OR (r->>'coinsSpent')::int<>200 OR (r->>'slot')::int NOT BETWEEN 1 AND 4
 THEN RAISE EXCEPTION 'stage4 global 200C failed %',r; END IF;

 -- Stage2 HIDDEN is a user action after 4 unique normals, no automatic card.
 INSERT INTO public.go_official_owned(member_id,dog_id,slot,power,charm)
 SELECT a,da,slot,3,3 FROM generate_series(1,4) slot
 ON CONFLICT (member_id,dog_id,slot) DO NOTHING;
 r:=public.go_official_unlock_hidden(a,da);
 IF r->>'ok'<>'true' OR NOT EXISTS(SELECT 1 FROM public.go_official_hidden WHERE member_id=a AND dog_id=da)
 THEN RAISE EXCEPTION 'manual HIDDEN unlock failed %',r; END IF;
 IF EXISTS(SELECT 1 FROM public.go_official_hidden WHERE member_id=b) THEN
  RAISE EXCEPTION 'HIDDEN leaked to other account'; END IF;

 IF NOT EXISTS(SELECT 1 FROM public.go_official_hidden WHERE member_id=a AND dog_id=da
    AND power BETWEEN 1 AND 5 AND charm BETWEEN 1 AND 5) THEN
  RAISE EXCEPTION 'HIDDEN received no permanent battle stats'; END IF;
 -- Repeat unlock must not change stored randomized power/charm.
 SELECT jsonb_build_object('power',power,'charm',charm) INTO receipt
 FROM public.go_official_hidden WHERE member_id=a AND dog_id=da;
 r:=public.go_official_unlock_hidden(a,da);
 IF r->>'ok'<>'true' OR (r->>'new')::boolean<>false OR
  (SELECT jsonb_build_object('power',power,'charm',charm)
   FROM public.go_official_hidden WHERE member_id=a AND dog_id=da)<>receipt THEN
  RAISE EXCEPTION 'HIDDEN unlock rerolled existing stats %',r; END IF;
 -- Random battle schema must distinguish official NO.5 from camera cards.
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='go_battles' AND column_name='first_kind')
 THEN RAISE EXCEPTION 'random official battle migration missing'; END IF;
 INSERT INTO public.go_battles(id,member_id,first_card_id,second_card_id,
   first_dog_id,second_dog_id,first_power,first_charm,first_element,first_bonus,first_score,
   second_power,second_charm,second_element,second_bonus,second_score,winner,
   first_kind,first_slot,second_kind,second_slot)
 SELECT 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',a,da,cb,da,db,
   h.power,h.charm,'햇살',0,h.power+h.charm,
   4,5,'숲',0,9,CASE WHEN h.power+h.charm>9 THEN 'first' WHEN h.power+h.charm=9 THEN 'draw' ELSE 'second' END,
   'official',5,'camera',NULL
 FROM public.go_official_hidden h WHERE h.member_id=a AND h.dog_id=da;
 IF NOT EXISTS(SELECT 1 FROM public.go_battles WHERE first_kind='official' AND first_slot=5
   AND second_kind='camera' AND second_slot IS NULL) THEN
   RAISE EXCEPTION 'random HIDDEN and camera battle record failed'; END IF;

 -- Stage5 two-member PvP and shared first-battle reward.
 r:=public.go_pvp_create(a);rid:=(r->>'roomId')::uuid;code:=r->>'inviteCode';
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'pvp create failed %',r; END IF;
 r:=public.go_pvp_join(b,code);
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'pvp join failed %',r; END IF;
 r:=public.go_pvp_action(a,rid,'select','camera',ca,NULL);
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'old personal card not battle eligible %',r; END IF;
 r:=public.go_pvp_action(b,rid,'select','camera',cb,NULL);
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'second card not battle eligible %',r; END IF;
 r:=public.go_pvp_action(a,rid,'ready');
 r:=public.go_pvp_action(b,rid,'ready');
 IF r->>'status'<>'completed' OR (SELECT count(*) FROM public.go_pvp_records WHERE room_id=rid)<>2 THEN
  RAISE EXCEPTION 'PvP result not persisted exactly once %',r; END IF;
 IF (SELECT count(*) FROM public.go_coin_transactions WHERE event_type='quest_battle')<>2 THEN
  RAISE EXCEPTION 'PvP daily battle quest not once per person'; END IF;

 -- Verify an actual friend match can select HIDDEN on one side and official on the other.
 r:=public.go_pvp_create(a);rid:=(r->>'roomId')::uuid;code:=r->>'inviteCode';
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'HIDDEN PvP room create failed %',r; END IF;
 r:=public.go_pvp_join(b,code);
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'HIDDEN PvP room join failed %',r; END IF;
 r:=public.go_pvp_action(a,rid,'select','official',da,5::smallint);
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'HIDDEN slot 5 PvP select failed %',r; END IF;
 -- Guarantee the second participant has one regular official card, but do not
 -- erase their camera-card stats or pre-existing draw result.
 INSERT INTO public.go_official_owned(member_id,dog_id,slot,power,charm)
 VALUES(b,db,1,3,4) ON CONFLICT (member_id,dog_id,slot) DO NOTHING;
 r:=public.go_pvp_action(b,rid,'select','official',db,1::smallint);
 IF r->>'ok'<>'true' THEN RAISE EXCEPTION 'normal official PvP select failed %',r; END IF;
 r:=public.go_pvp_action(a,rid,'ready');
 r:=public.go_pvp_action(b,rid,'ready');
 IF r->>'status'<>'completed' OR
    (SELECT count(*) FROM public.go_pvp_records WHERE room_id=rid)<>2 THEN
  RAISE EXCEPTION 'official/HIDDEN friend PvP failed %',r; END IF;
 IF (SELECT count(*) FROM public.go_coin_transactions WHERE event_type='quest_battle')<>2 THEN
  RAISE EXCEPTION 'PvP rematch duplicated the daily battle reward'; END IF;

 -- Cannot fake a past receipt or freely alter previous cards.
 IF (SELECT count(*) FROM public.go_cards)<>2 OR
    (SELECT count(*) FROM public.go_members)<>2 OR
    (SELECT count(*) FROM public.go_coin_transactions WHERE source_key='qa:historic:one')<>1 THEN
  RAISE EXCEPTION 'Integration changed preexisting card/member/receipt'; END IF;
 RAISE NOTICE 'PASS all 2→3→4→5 SQL migrations with 2 synthetic legacy cards, daily draw, care+coin, 200/300 purchases, HIDDEN, PvP and preexisting data preserved';
END $integration$;
