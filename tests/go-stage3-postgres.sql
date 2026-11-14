-- Stage-three PvP contract. Disposable PG17 fixture only; no live Supabase.
DO $verify$
DECLARE
 h uuid:='77777777-7777-4777-8777-777777777777';
 g uuid:='66666666-6666-4666-8666-666666666666';
 outsider uuid:='55555555-5555-4555-8555-555555555555';
 d_h uuid:='22222222-2222-4222-8222-222222222222';
 d_g uuid:='99999999-9999-4999-8999-999999999999';
 card_h uuid:=gen_random_uuid();card_g uuid:=gen_random_uuid();card_o uuid:=gen_random_uuid();
 v_room uuid;v_code text;v_room2 uuid;v_room3 uuid;v_room4 uuid;
 v jsonb;v_self jsonb;v_guest jsonb;v_count integer;v_total integer;
BEGIN
 INSERT INTO public.go_members(id) VALUES(h),(g),(outsider);
 INSERT INTO public.go_cards(id,member_id,dog_id,status,title,description,image_path,
  photo_style,cuteness,charm,affection)
 VALUES(card_h,h,d_h,'approved','깡지 출전','기존 사진','host.webp','original',3,3,3),
       (card_g,g,d_g,'approved','버디 출전','기존 사진','guest.webp','original',3,3,3),
       (card_o,outsider,d_g,'approved','관전자 카드','사진','outsider.webp','original',3,3,3);
 UPDATE public.go_battle_card_stats SET power=5,charm=5 WHERE card_id=card_h;
 UPDATE public.go_battle_card_stats SET power=1,charm=1 WHERE card_id=card_g;
 SELECT public.go_pvp_create(h) INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'host create failed: %',v; END IF;
 v_room:=(v->>'roomId')::uuid;v_code:=v->>'inviteCode';
 IF length(v_code)<>12 THEN RAISE EXCEPTION 'invalid invite code'; END IF;
 SELECT public.go_pvp_snapshot(outsider,v_room) INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'unauthorized room snapshot leaked waiting invite: %',v; END IF;
 SELECT public.go_pvp_action(outsider,v_room,'sync') INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'outsider mutated room'; END IF;
 SELECT public.go_pvp_join(g,v_code) INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'guest join failed: %',v; END IF;
 SELECT public.go_pvp_join(outsider,v_code) INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION '3rd participant joined'; END IF;
 SELECT public.go_pvp_action(h,v_room,'select','camera',card_h,NULL) INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'host card select failed: %',v; END IF;
 SELECT public.go_pvp_action(g,v_room,'select','camera',card_h,NULL) INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'guest selected host card'; END IF;
 SELECT public.go_pvp_action(h,v_room,'ready') INTO v;
 IF (v->>'status')<>'ready' THEN RAISE EXCEPTION 'host ready failed: %',v; END IF;
 SELECT public.go_pvp_snapshot(g,v_room) INTO v_guest;
 IF v_guest->'otherCard' IS DISTINCT FROM 'null'::jsonb OR
    (v_guest->>'otherReady')::boolean IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'opponent card leaked before both ready: %',v_guest; END IF;
 SELECT public.go_pvp_action(h,v_room,'unready') INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'unready failed'; END IF;
 SELECT public.go_pvp_action(h,v_room,'ready') INTO v;
 SELECT public.go_pvp_action(g,v_room,'select','camera',card_g,NULL) INTO v;
 SELECT public.go_pvp_action(g,v_room,'ready') INTO v;
 IF (v->>'status')<>'completed' THEN RAISE EXCEPTION 'both ready not completed: %',v; END IF;
 SELECT public.go_pvp_snapshot(h,v_room) INTO v_self;
 SELECT public.go_pvp_snapshot(g,v_room) INTO v_guest;
 IF v_self->>'winner'<>'host' OR v_guest->>'winner'<>'host' OR
    (v_self->>'hostScore')::integer<>10 OR (v_guest->>'guestScore')::integer<>2 OR
    v_self->'otherCard' IS NULL OR v_guest->'otherCard' IS NULL THEN
  RAISE EXCEPTION 'results or joint reveal inconsistent: host=% guest=%',v_self,v_guest; END IF;
 SELECT count(*) INTO v_count FROM public.go_pvp_records WHERE room_id=v_room;
 IF v_count<>2 THEN RAISE EXCEPTION 'two immutable records missing'; END IF;
 SELECT public.go_pvp_action(g,v_room,'ready') INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'double READY recorded again'; END IF;
 SELECT count(*) INTO v_count FROM public.go_coin_transactions
  WHERE member_id IN(h,g) AND event_type='quest_battle';
 IF v_count<>2 THEN RAISE EXCEPTION 'not exactly one quest award per participant: %',v_count; END IF;
 SELECT sum(balance) INTO v_total FROM public.go_coin_wallets WHERE member_id IN(h,g);
 IF v_total<>20 THEN RAISE EXCEPTION 'wallet credit mismatch after first match: %',v_total; END IF;

 -- Rematch only after both opt in; both must reselect.
 SELECT public.go_pvp_action(h,v_room,'rematch') INTO v;
 IF (v->>'status')<>'waiting-rematch' THEN RAISE EXCEPTION 'rematch missing consent: %',v; END IF;
 SELECT public.go_pvp_action(g,v_room,'rematch') INTO v;
 IF (v->>'status')<>'playing' THEN RAISE EXCEPTION 'rematch not started: %',v; END IF;
 SELECT public.go_pvp_snapshot(h,v_room) INTO v;
 IF (v->>'round')::integer<>2 OR (v->>'mySelected')::boolean IS DISTINCT FROM false
  THEN RAISE EXCEPTION 'rematch used stale selection'; END IF;
 UPDATE public.go_battle_card_stats SET power=3,charm=3 WHERE card_id IN(card_h,card_g);
 SELECT public.go_pvp_action(h,v_room,'select','camera',card_h,NULL) INTO v;
 SELECT public.go_pvp_action(g,v_room,'select','camera',card_g,NULL) INTO v;
 SELECT public.go_pvp_action(h,v_room,'ready') INTO v;
 SELECT public.go_pvp_action(g,v_room,'ready') INTO v;
 SELECT public.go_pvp_snapshot(h,v_room) INTO v;
 IF v->>'winner'<>'draw' OR (v->'myStats'->>'draws')::integer<>1 OR
  (v->'myStats'->>'wins')::integer<>1 THEN RAISE EXCEPTION 'draw/rematch stats failed: %',v; END IF;
 SELECT count(*) INTO v_count FROM public.go_coin_transactions
  WHERE member_id IN(h,g) AND event_type='quest_battle';
 IF v_count<>2 THEN RAISE EXCEPTION 'rematch double-awarded quest'; END IF;
 SELECT count(*) INTO v_count FROM public.go_pvp_records WHERE room_id=v_room;
 IF v_count<>4 THEN RAISE EXCEPTION 'rematch did not write 2 extra player records'; END IF;

 -- Separate rooms: expiry, two-minute ready limit, 30-second disconnect.
 SELECT public.go_pvp_create(h) INTO v;v_room2:=(v->>'roomId')::uuid;
 UPDATE public.go_pvp_rooms SET invite_expires_at=now()-interval '1 minute' WHERE id=v_room2;
 SELECT public.go_pvp_join(outsider,v_room2::text) INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'expired invite joined'; END IF;
 SELECT public.go_pvp_create(h) INTO v;v_room3:=(v->>'roomId')::uuid;
 SELECT public.go_pvp_join(g,v_room3::text) INTO v;
 UPDATE public.go_pvp_rooms SET ready_deadline=now()-interval '1 second' WHERE id=v_room3;
 SELECT public.go_pvp_action(h,v_room3,'sync') INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'two-minute ready deadline ignored'; END IF;
 SELECT public.go_pvp_create(h) INTO v;v_room4:=(v->>'roomId')::uuid;
 SELECT public.go_pvp_join(g,v_room4::text) INTO v;
 UPDATE public.go_pvp_rooms SET host_seen_at=now()-interval '31 seconds' WHERE id=v_room4;
 SELECT public.go_pvp_action(g,v_room4,'sync') INTO v;
 IF (v->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION '30-second disconnect not cancelled'; END IF;
 SELECT count(*) INTO v_count FROM public.go_pvp_records
  WHERE room_id IN (v_room2,v_room3,v_room4);
 IF v_count<>0 THEN RAISE EXCEPTION 'abandoned room created match history'; END IF;

 -- Existing camera cards can be deleted while history remains.
 DELETE FROM public.go_cards WHERE id IN (card_h,card_g);
 SELECT count(*) INTO v_count FROM public.go_pvp_records WHERE room_id=v_room;
 IF v_count<>4 THEN RAISE EXCEPTION 'card deletion erased PvP record'; END IF;
 IF has_table_privilege('authenticated','public.go_pvp_rooms','SELECT')
 OR has_table_privilege('anon','public.go_pvp_rounds','SELECT')
 OR has_function_privilege('authenticated','public.go_pvp_action(uuid,uuid,text,text,uuid,smallint)','EXECUTE')
 THEN RAISE EXCEPTION 'client gained direct access to private battle tables'; END IF;
 RAISE NOTICE 'STAGE 3 PASS: friend room, privacy, ready/unready, pure-stat winner, rematches, rewards, expiry, disconnect, permanent history';
END$verify$;
