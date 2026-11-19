-- Synthetic-only stage4 transaction assertions. Run after the previous disposable DB migrations.
-- Never run on production or connect a remote database.
DO $qa$
DECLARE
 c uuid:='99999999-9999-4999-8999-999999999999';
 d uuid:='aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
 da uuid:='33333333-3333-4333-8333-333333333333';
 a uuid:='11111111-1111-4111-8111-111111111111';
 req uuid:='cccccccc-1111-4111-8111-111111111111';
 r jsonb; again jsonb; choice uuid; old_power integer; old_charm integer; quest_count integer;
BEGIN
 IF NOT public.go_dog_release_ready(da) THEN RAISE EXCEPTION 'synthetic dog is not published'; END IF;
 SELECT count(*) INTO quest_count FROM public.go_coin_transactions WHERE event_type='quest_draw';
 INSERT INTO public.go_members(id,nickname,nickname_key,password_hash,recovery_hash) VALUES
  (c,'QA검증가C','stage4testc','test','test'),
  (d,'QA검증가D','stage4testd','test','test');
 INSERT INTO public.go_coin_wallets(member_id,balance) VALUES(c,1000),(d,0);
 INSERT INTO public.go_official_owned(member_id,dog_id,slot,power,charm)
  SELECT d,da,slot,2,3 FROM generate_series(1,4) slot;
 -- Free 2/day, idempotency, no quest_draw issuance.
 r:=public.go_official_draw_v2(c,'00000000-0000-4000-8000-000000000001');
 IF r->>'ok'<>'true' OR (r->>'duplicate')::boolean THEN RAISE EXCEPTION 'first free new draw %',r; END IF;
 again:=public.go_official_draw_v2(c,'00000000-0000-4000-8000-000000000001');
 IF again->>'replayed'<>'true' OR r->>'drawId'<>again->>'drawId' THEN RAISE EXCEPTION 'free idempotency %',again; END IF;
 r:=public.go_official_draw_v2(c,'00000000-0000-4000-8000-000000000002');
 IF r->>'ok'<>'true' OR (r->>'duplicate')::boolean THEN RAISE EXCEPTION 'second free new draw %',r; END IF;
 r:=public.go_official_draw_v2(c,'00000000-0000-4000-8000-000000000003');
 IF r->>'ok'<>'false' THEN RAISE EXCEPTION 'third free draw allowed %',r; END IF;
 IF (SELECT count(*) FROM public.go_coin_transactions WHERE event_type='quest_draw')<>quest_count
 THEN RAISE EXCEPTION 'free draw incorrectly issued quest coins'; END IF;
 -- Exhausted collection: owned pool is 100%; user closure means keep previous stats.
 SELECT power,charm INTO old_power,old_charm FROM public.go_official_owned WHERE member_id=d AND dog_id=da AND slot=1;
 r:=public.go_official_draw_v2(d,'00000000-0000-4000-8000-000000000004');
 IF r->>'ok'<>'true' OR r->>'duplicate'<>'true' OR r->>'requiresChoice'<>'true'
 THEN RAISE EXCEPTION 'completed collection failed owned-only free %',r; END IF;
 choice:=(r->>'drawId')::uuid;
 again:=public.go_official_draw_v2(d,'00000000-0000-4000-8000-000000000005');
 IF again->>'ok'<>'false' THEN RAISE EXCEPTION 'unresolved duplicate permitted next draw %',again; END IF;
 again:=public.go_official_resolve_duplicate_v2(d,choice,false);
 IF again->>'ok'<>'true' THEN RAISE EXCEPTION 'X-close keep-original failed %',again; END IF;
 r:=public.go_official_draw_v2(d,'00000000-0000-4000-8000-000000000005');
 IF r->>'ok'<>'true' OR r->>'duplicate'<>'true' THEN RAISE EXCEPTION 'second full-collection draw %',r; END IF;
 choice:=(r->>'drawId')::uuid;
 again:=public.go_official_resolve_duplicate_v2(d,choice,true);
 IF again->>'ok'<>'true' THEN RAISE EXCEPTION 'duplicate replace failed %',again; END IF;
 r:=public.go_official_draw_v2(d,'00000000-0000-4000-8000-000000000006');
 IF r->>'ok'<>'false' THEN RAISE EXCEPTION 'third draw allowed for complete collection %',r; END IF;
 -- New prices, same-request replay, and protected purchases.
 r:=public.go_store_purchase_v2(c,'00000000-0000-4000-8000-000000000007','random');
 IF r->>'ok'<>'true' OR (r->>'price')::int<>60 OR (r->>'coinsSpent')::int<>60
 THEN RAISE EXCEPTION 'new random 60C purchase %',r; END IF;
 again:=public.go_store_purchase_v2(c,'00000000-0000-4000-8000-000000000007','random');
 IF again->>'ok'<>'true' OR (again->>'coinsSpent')::int<>0 OR (again->>'price')::int<>60
 THEN RAISE EXCEPTION 'repeat 60C charged twice %',again; END IF;
 IF r->>'requiresChoice'='true' THEN
  PERFORM public.go_official_resolve_duplicate_v2(c,(r->>'choiceId')::uuid,false);
 END IF;
 r:=public.go_store_purchase_v2(c,'00000000-0000-4000-8000-000000000008','specific',da,NULL);
 IF r->>'ok'<>'true' OR (r->>'price')::int<>100 OR (r->>'coinsSpent')::int<>100 OR r->>'dogId'<>da::text
 THEN RAISE EXCEPTION 'new specific 100C purchase %',r; END IF;
 IF r->>'requiresChoice'='true' THEN
  PERFORM public.go_official_resolve_duplicate_v2(c,(r->>'choiceId')::uuid,false);
 END IF;
 r:=public.go_store_purchase_v2(d,'00000000-0000-4000-8000-000000000009','random');
 IF r->>'ok'<>'false' THEN RAISE EXCEPTION 'zero-balance purchase was allowed %',r; END IF;
 -- Historical 300C purchase is never rewritten or charged at current price.
 r:=public.go_store_purchase_v2(a,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','specific',da,NULL);
 IF r->>'ok'<>'true' OR r->>'replayed'<>'true' OR (r->>'price')::int<>300 OR (r->>'coinsSpent')::int<>0
 THEN RAISE EXCEPTION 'historical 300C purchase not preserved %',r; END IF;
 -- Account-specific first +10C, then repeatable win +3C, loss 0C, cross-mode once/day.
 IF public.go_battle_award_result(c,'random','qa-r1',true)<>10
 THEN RAISE EXCEPTION 'first winning random battle not 10C'; END IF;
 IF public.go_battle_award_result(c,'random','qa-r1',true)<>0
 THEN RAISE EXCEPTION 'random replay reissued coins'; END IF;
 IF public.go_battle_award_result(c,'random','qa-r2',true)<>3
 THEN RAISE EXCEPTION 'second winning random battle not 3C'; END IF;
 IF public.go_battle_award_result(c,'random','qa-r3',false)<>0
 THEN RAISE EXCEPTION 'later loss gave coins'; END IF;
 IF public.go_battle_award_result(c,'pvp','qa-p1',true)<>3
 THEN RAISE EXCEPTION 'cross-mode extra win not 3C'; END IF;
 IF public.go_battle_award_result(d,'pvp','qa-p2',false)<>10
 THEN RAISE EXCEPTION 'first lost PvP did not grant 10C'; END IF;
 IF public.go_battle_award_result(d,'pvp','qa-p3',false)<>0 OR
    public.go_battle_award_result(d,'pvp','qa-p4',true)<>3
 THEN RAISE EXCEPTION 'later PvP loss/win award incorrect'; END IF;
 IF (SELECT balance FROM public.go_coin_wallets WHERE member_id=c)<>856
 THEN RAISE EXCEPTION 'wallet C not equal 1000 - 60 - 100 + 10 + 3 + 3'; END IF;
 IF (SELECT balance FROM public.go_coin_wallets WHERE member_id=d)<>13
 THEN RAISE EXCEPTION 'wallet D not equal 0 + 10 + 3'; END IF;
 IF (SELECT coalesce(sum(amount),0) FROM public.go_coin_transactions WHERE member_id=c)<>-144
 THEN RAISE EXCEPTION 'coin log and wallet C mismatch'; END IF;
 IF (SELECT coalesce(sum(amount),0) FROM public.go_coin_transactions WHERE member_id=d)<>13
 THEN RAISE EXCEPTION 'coin log and wallet D mismatch'; END IF;
 IF (SELECT count(*) FROM public.go_battle_reward_claims WHERE member_id=c)<>4
 THEN RAISE EXCEPTION 'all 0C/3C/10C settlements not recorded'; END IF;
 RAISE NOTICE 'PASS stage4 synthetic 2/day, duplicate KEEP/REPLACE, 60/100C purchases, historic receipts, atomic payout identities and wallet reconciliation';
END $qa$;
