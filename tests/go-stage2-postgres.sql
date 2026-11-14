-- Stage-two integration assertions run under isolated PostgreSQL 17.
DO $$
DECLARE
 m uuid:='11111111-1111-4111-8111-111111111111';
 m2 uuid:='88888888-8888-4888-8888-888888888888';
 d uuid:='22222222-2222-4222-8222-222222222222';
 d2 uuid:='99999999-9999-4999-8999-999999999999';
 draft uuid;v2 uuid;r jsonb;v_count int;v_power int;v_charm int;v_before_version uuid;
 i integer;v_id uuid;v_action text;
BEGIN
 SELECT public.go_official_new_draft(d) INTO draft;
 IF draft IS NULL OR draft<>public.go_official_new_draft(d) THEN RAISE EXCEPTION 'one draft per dog'; END IF;
 SELECT public.go_official_manage(d,'publish',draft) INTO r;
 IF (r->>'ok')::boolean THEN RAISE EXCEPTION 'incomplete set was published'; END IF;
 FOR i IN 1..6 LOOP
  INSERT INTO public.go_official_assets(version_id,slot,title,original_path,display_path)
   VALUES(draft,i,CASE WHEN i=6 THEN '' ELSE '사진 '||i END,
      'dog/'||i||'-original','dog/'||i||'-display.webp');
 END LOOP;
 SELECT public.go_official_manage(d,'publish',draft) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'publish failed: %',r; END IF;

 -- Guarantee store selects the last missing slot and grants HIDDEN permanently.
 INSERT INTO public.go_official_owned(member_id,dog_id,slot,power,charm)
  SELECT m,d,s.slot_index,3,3 FROM generate_series(1,4) AS s(slot_index);
 UPDATE public.go_coin_wallets SET balance=500 WHERE member_id=m;
 SELECT public.go_official_purchase(m,d,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM true OR (r->>'slot')::int<>5
   OR (r->>'balance')::int<>300 OR (r->>'hiddenUnlocked')::boolean IS DISTINCT FROM true
 THEN RAISE EXCEPTION '200C missing slot purchase failed: %',r; END IF;
 SELECT public.go_official_purchase(m,d,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') INTO r;
 IF (r->>'replayed')::boolean IS DISTINCT FROM true OR (r->>'coinsSpent')::int<>0
 THEN RAISE EXCEPTION 'purchase retry double-charged: %',r; END IF;
 SELECT count(*) INTO v_count FROM public.go_official_hidden WHERE member_id=m AND dog_id=d;
 IF v_count<>1 THEN RAISE EXCEPTION 'HIDDEN not unlocked at 5/5'; END IF;
 SELECT power,charm INTO v_power,v_charm FROM public.go_official_owned
  WHERE member_id=m AND dog_id=d AND slot=5;

 SELECT public.go_official_draw(m) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM true OR (r->>'duplicate')::boolean IS DISTINCT FROM true
  OR (r->>'coinsAdded')::int<>10 OR (r->>'requiresChoice')::boolean IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'duplicate draw or quest failed: %',r; END IF;
 SELECT public.go_official_draw(m) INTO r;
 IF (r->>'replayed')::boolean IS DISTINCT FROM true OR (r->>'coinsAdded')::int<>0
 THEN RAISE EXCEPTION 'daily draw not idempotent: %',r; END IF;
 SELECT public.go_official_resolve_duplicate(m,false) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'keep failed'; END IF;
 SELECT power,charm INTO v_count,i FROM public.go_official_owned WHERE member_id=m AND dog_id=d AND slot=5;
 IF v_count<>v_power OR i<>v_charm THEN RAISE EXCEPTION 'keeping older duplicate replaced stats'; END IF;
 SELECT count(*) INTO v_count FROM public.go_coin_transactions
  WHERE member_id=m AND event_type='quest_draw';
 IF v_count<>1 THEN RAISE EXCEPTION 'first free draw quest rewarded multiple times'; END IF;

 -- A newly drafted version edits images without changing owners, stats or HIDDEN.
 SELECT current_version INTO v_before_version FROM public.go_official_sets WHERE dog_id=d;
 SELECT public.go_official_new_draft(d) INTO v2;
 IF v2=v_before_version THEN RAISE EXCEPTION 'not a new draft'; END IF;
 UPDATE public.go_official_assets SET display_path='dog/changed.webp'
  WHERE version_id=v2 AND slot=1;
 SELECT public.go_official_manage(d,'publish',v2) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'change publish failed: %',r; END IF;
 SELECT count(*) INTO v_count FROM public.go_official_owned WHERE member_id=m AND dog_id=d;
 IF v_count<>5 THEN RAISE EXCEPTION 'photo edit removed user ownership'; END IF;
 SELECT count(*) INTO v_count FROM public.go_official_hidden WHERE member_id=m AND dog_id=d;
 IF v_count<>1 THEN RAISE EXCEPTION 'photo edit removed HIDDEN'; END IF;
 SELECT public.go_official_manage(d,'pause',null) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'pause failed'; END IF;
 SELECT public.go_official_draw(m2) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'paused card was drawn'; END IF;
 SELECT public.go_official_manage(d,'resume',null) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'resume failed'; END IF;
 SELECT public.go_official_draw(m2) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM true OR (r->>'duplicate')::boolean IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'free draw missing first card: %',r; END IF;
 SELECT public.go_official_manage(d,'deleteSet',null) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'historical ownership delete guard failed'; END IF;

 -- Camera quota starts only from stage-two creations, excluding prior camera posts.
 FOR i IN 1..3 LOOP
  v_id:=gen_random_uuid();
  SELECT public.go_camera_create_limited(m2,v_id,d2,'촬영 '||i,'user/new.webp',3::smallint,4::smallint,2::smallint) INTO r;
  IF (r->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'camera quota rejected early: %',r; END IF;
 END LOOP;
 SELECT public.go_camera_create_limited(m2,gen_random_uuid(),d2,'네 번째','user/new.webp',3::smallint,4::smallint,2::smallint) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM false THEN RAISE EXCEPTION 'camera daily limit missing: %',r; END IF;
 SELECT count(*) INTO v_count FROM public.go_cards WHERE member_id=m2;
 IF v_count<>3 THEN RAISE EXCEPTION 'camera quota mutated unexpected cards'; END IF;

  -- Stage-two adoption-complete exclusion must not destroy earlier ownership.
  UPDATE public.dogs SET adopted=true WHERE id=d;
  INSERT INTO public.go_members(id) VALUES('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  INSERT INTO public.go_coin_wallets(member_id,balance)
   VALUES('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',500);
  SELECT public.go_official_draw('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee') INTO r;
  IF (r->>'ok')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'adopted dog appeared in new free draw: %',r; END IF;
  SELECT public.go_official_purchase('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    d,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') INTO r;
  IF (r->>'ok')::boolean IS DISTINCT FROM false OR (r->>'error') NOT LIKE '%구매할 수 없는%' THEN RAISE EXCEPTION 'adopted dog was sold or reason misidentified: %',r; END IF;
  SELECT count(*) INTO v_count FROM public.go_official_hidden WHERE member_id=m AND dog_id=d;
  IF v_count<>1 THEN RAISE EXCEPTION 'adoption complete removed existing hidden reward'; END IF;
  UPDATE public.dogs SET adopted=false WHERE id=d;

  -- Publishing and deleting a never-acquired complete set is allowed.
  SELECT public.go_official_new_draft(d2) INTO v2;
  FOR i IN 1..6 LOOP
   INSERT INTO public.go_official_assets(version_id,slot,title,original_path,display_path)
    VALUES(v2,i,CASE WHEN i=6 THEN '' ELSE '사진 '||i END,
     'unused/'||i||'-source','unused/'||i||'-render');
  END LOOP;
  SELECT public.go_official_manage(d2,'publish',v2) INTO r;
  IF (r->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'unused set publish failed'; END IF;
  SELECT public.go_official_manage(d2,'deleteSet',null) INTO r;
  IF (r->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'uncollected set delete was wrongly denied'; END IF;

  DELETE FROM public.go_cards WHERE id=(
    SELECT card_id FROM public.go_camera_daily_creations WHERE member_id=m2 LIMIT 1
  );
  SELECT count(*) INTO v_count FROM public.go_camera_daily_creations WHERE member_id=m2;
  IF v_count<>3 THEN RAISE EXCEPTION 'deleting a camera card restored the daily quota'; END IF;
  SELECT public.go_camera_create_limited(m2,gen_random_uuid(),d2,'여전히 네 번째',
    'user/new.webp',3::smallint,4::smallint,2::smallint) INTO r;
  IF (r->>'ok')::boolean IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'deleted card incorrectly refunded camera daily quota'; END IF;


 -- Revoke account memberships and source rows, but a previously issued set
 -- remains protected by a dog-only permanent issuance marker (no member ID).
 -- Simulate account-withdrawal cleanup: camera posts are deleted first
 -- because the fixture has a restricted member foreign key on go_cards.
 DELETE FROM public.go_cards WHERE member_id IN (m,m2);
 DELETE FROM public.go_visit_admin_audit WHERE request_id IN (
  SELECT id FROM public.go_visit_requests WHERE member_id IN (m,m2)
 );
 DELETE FROM public.go_members WHERE id IN (m,m2);
 SELECT count(*) INTO v_count FROM public.go_official_owned WHERE dog_id=d;
 IF v_count<>0 THEN RAISE EXCEPTION 'test setup did not erase ownership on account deletion'; END IF;
 SELECT count(*) INTO v_count FROM public.go_official_issuance_markers WHERE dog_id=d;
 IF v_count<>1 THEN RAISE EXCEPTION 'past official issuance erased with account deletion'; END IF;
 SELECT public.go_official_manage(d,'deleteSet',null) INTO r;
 IF (r->>'ok')::boolean IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'historically acquired set was deletable after account deletion: %',r;
 END IF;

 IF has_table_privilege('authenticated','public.go_official_owned','SELECT') OR
    has_function_privilege('authenticated','public.go_official_purchase(uuid,uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'official ownership or shop exposed to client';
 END IF;
 RAISE NOTICE 'STAGE TWO SQL PASS: versions, buy, hidden, draw, owner safety, camera quota';
END$$;
