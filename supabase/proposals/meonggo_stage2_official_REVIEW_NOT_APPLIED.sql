-- STAGE 2 PROPOSAL ONLY. NEVER APPLY DIRECTLY TO PRODUCTION.
-- Apply after stage-one coin proposals, in disposable CI database.
BEGIN;
CREATE TABLE IF NOT EXISTS public.go_official_sets(
 dog_id uuid PRIMARY KEY REFERENCES public.dogs(id) ON DELETE RESTRICT,
 current_version uuid,
 paused boolean NOT NULL DEFAULT false,
 published_once_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.go_official_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dog_id uuid NOT NULL REFERENCES public.go_official_sets(dog_id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','retired')),
 created_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz,
 UNIQUE(id,dog_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS go_official_one_draft
 ON public.go_official_versions(dog_id) WHERE status='draft';
CREATE UNIQUE INDEX IF NOT EXISTS go_official_one_published
 ON public.go_official_versions(dog_id) WHERE status='published';
ALTER TABLE public.go_official_sets
 ADD CONSTRAINT go_official_current_version_fk FOREIGN KEY(current_version,dog_id)
 REFERENCES public.go_official_versions(id,dog_id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS public.go_official_assets(
 version_id uuid NOT NULL REFERENCES public.go_official_versions(id) ON DELETE CASCADE,
 slot smallint NOT NULL CHECK(slot BETWEEN 1 AND 6),
 title text NOT NULL DEFAULT '' CHECK(char_length(title)<=30),
 original_path text NOT NULL CHECK(length(original_path) BETWEEN 4 AND 400),
 display_path text NOT NULL CHECK(length(display_path) BETWEEN 4 AND 400),
 crop_x numeric(6,4) NOT NULL DEFAULT 0.5 CHECK(crop_x BETWEEN 0 AND 1),
 crop_y numeric(6,4) NOT NULL DEFAULT 0.5 CHECK(crop_y BETWEEN 0 AND 1),
 zoom numeric(6,3) NOT NULL DEFAULT 1 CHECK(zoom BETWEEN 1 AND 3),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(version_id,slot),
 CHECK(slot=6 OR length(trim(title)) BETWEEN 1 AND 30)
);

CREATE TABLE IF NOT EXISTS public.go_official_owned(
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 dog_id uuid NOT NULL REFERENCES public.go_official_sets(dog_id) ON DELETE RESTRICT,
 slot smallint NOT NULL CHECK(slot BETWEEN 1 AND 5),
 power smallint NOT NULL CHECK(power BETWEEN 1 AND 5),
 charm smallint NOT NULL CHECK(charm BETWEEN 1 AND 5),
 acquired_at timestamptz NOT NULL DEFAULT now(),
 seen_at timestamptz,
 PRIMARY KEY(member_id,dog_id,slot)
);
CREATE INDEX IF NOT EXISTS go_official_owned_by_dog ON public.go_official_owned(dog_id,member_id);

CREATE TABLE IF NOT EXISTS public.go_official_hidden(
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 dog_id uuid NOT NULL REFERENCES public.go_official_sets(dog_id) ON DELETE RESTRICT,
 unlocked_at timestamptz NOT NULL DEFAULT now(),
 seen_at timestamptz,
 PRIMARY KEY(member_id,dog_id)
);

CREATE TABLE IF NOT EXISTS public.go_official_daily_draws(
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 local_day date NOT NULL,
 dog_id uuid NOT NULL REFERENCES public.go_official_sets(dog_id) ON DELETE RESTRICT,
 slot smallint NOT NULL CHECK(slot BETWEEN 1 AND 5),
 duplicate boolean NOT NULL,
 proposed_power smallint CHECK(proposed_power BETWEEN 1 AND 5),
 proposed_charm smallint CHECK(proposed_charm BETWEEN 1 AND 5),
 resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(member_id,local_day),
 CHECK(NOT duplicate OR (proposed_power IS NOT NULL AND proposed_charm IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS public.go_official_purchases(
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 dog_id uuid NOT NULL REFERENCES public.go_official_sets(dog_id) ON DELETE RESTRICT,
 slot smallint NOT NULL CHECK(slot BETWEEN 1 AND 5),
 coins integer NOT NULL DEFAULT 200 CHECK(coins=200),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(member_id,request_id)
);
CREATE TABLE IF NOT EXISTS public.go_camera_daily_creations(
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 local_day date NOT NULL,
 card_id uuid NOT NULL UNIQUE REFERENCES public.go_cards(id) ON DELETE RESTRICT,
 PRIMARY KEY(member_id,local_day,card_id)
);
CREATE INDEX IF NOT EXISTS go_camera_daily_idx
 ON public.go_camera_daily_creations(member_id,local_day);

ALTER TABLE public.go_coin_transactions DROP CONSTRAINT IF EXISTS go_coin_transactions_event_type_check;
ALTER TABLE public.go_coin_transactions ADD CONSTRAINT go_coin_transactions_event_type_check
 CHECK(event_type IN ('care','quest_care','quest_visit','visit_reversal',
   'store_purchase','quest_draw','quest_battle'));

DO $rls$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY[
 'go_official_sets','go_official_versions','go_official_assets',
 'go_official_owned','go_official_hidden','go_official_daily_draws',
 'go_official_purchases','go_camera_daily_creations'
 ] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO service_role',t);
 END LOOP;
END$rls$;

CREATE OR REPLACE FUNCTION public.go_official_new_draft(p_dog uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_id uuid;v_pub uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.dogs WHERE id=p_dog AND category='adoption') THEN
  RAISE EXCEPTION 'Only registered adoption dogs may have official cards';
 END IF;
 INSERT INTO public.go_official_sets(dog_id) VALUES(p_dog) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.go_official_sets WHERE dog_id=p_dog FOR UPDATE;
 SELECT id INTO v_id FROM public.go_official_versions
  WHERE dog_id=p_dog AND status='draft' LIMIT 1;
 IF v_id IS NOT NULL THEN RETURN v_id; END IF;
 SELECT current_version INTO v_pub FROM public.go_official_sets WHERE dog_id=p_dog;
 INSERT INTO public.go_official_versions(dog_id) VALUES(p_dog) RETURNING id INTO v_id;
 IF v_pub IS NOT NULL THEN
  INSERT INTO public.go_official_assets(version_id,slot,title,original_path,display_path,crop_x,crop_y,zoom)
   SELECT v_id,slot,title,original_path,display_path,crop_x,crop_y,zoom
   FROM public.go_official_assets WHERE version_id=v_pub;
 END IF;
 RETURN v_id;
END;$$;

CREATE OR REPLACE FUNCTION public.go_official_manage(
 p_dog uuid,p_action text,p_draft uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_set public.go_official_sets%ROWTYPE;v_count integer;v_history boolean;
BEGIN
 SELECT * INTO v_set FROM public.go_official_sets WHERE dog_id=p_dog FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','공식 카드 세트가 없어요.'); END IF;
 IF p_action='publish' THEN
  IF p_draft IS NULL OR NOT EXISTS(SELECT 1 FROM public.go_official_versions
     WHERE id=p_draft AND dog_id=p_dog AND status='draft') THEN
   RETURN jsonb_build_object('ok',false,'error','수정안을 확인해주세요.'); END IF;
  SELECT count(*) INTO v_count FROM public.go_official_assets
   WHERE version_id=p_draft AND display_path<>'' AND original_path<>'';
  IF v_count<>6 THEN RETURN jsonb_build_object('ok',false,'error','사진 5종과 HIDDEN 일러스트를 모두 등록해주세요.'); END IF;
  -- Old public revision remains unchanged until all six assets are validated.
  UPDATE public.go_official_versions SET status='retired'
   WHERE id=v_set.current_version AND status='published';
  UPDATE public.go_official_versions SET status='published',published_at=now() WHERE id=p_draft;
  UPDATE public.go_official_sets SET current_version=p_draft,
    published_once_at=COALESCE(published_once_at,now()),updated_at=now() WHERE dog_id=p_dog;
  RETURN jsonb_build_object('ok',true,'status','published','paused',v_set.paused);
 ELSIF p_action IN ('pause','resume') THEN
  IF v_set.current_version IS NULL THEN RETURN jsonb_build_object('ok',false,'error','공개된 세트가 없어요.'); END IF;
  UPDATE public.go_official_sets SET paused=(p_action='pause'),updated_at=now() WHERE dog_id=p_dog;
  RETURN jsonb_build_object('ok',true,'status',p_action);
 ELSIF p_action='discardDraft' THEN
  IF p_draft IS NULL THEN RETURN jsonb_build_object('ok',false,'error','수정안을 확인해주세요.'); END IF;
  DELETE FROM public.go_official_versions WHERE dog_id=p_dog AND id=p_draft AND status='draft';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','초안이 없어요.'); END IF;
  RETURN jsonb_build_object('ok',true,'status','discarded');
 ELSIF p_action='deleteSet' THEN
  SELECT EXISTS(SELECT 1 FROM public.go_official_owned WHERE dog_id=p_dog)
      OR EXISTS(SELECT 1 FROM public.go_official_hidden WHERE dog_id=p_dog)
      OR EXISTS(SELECT 1 FROM public.go_official_daily_draws WHERE dog_id=p_dog)
      OR EXISTS(SELECT 1 FROM public.go_official_purchases WHERE dog_id=p_dog)
   INTO v_history;
  IF v_history THEN RETURN jsonb_build_object('ok',false,'error',
    '과거 획득·해금 기록이 있어 영구 삭제할 수 없어요. 공개 중지를 이용해주세요.'); END IF;
  DELETE FROM public.go_official_sets WHERE dog_id=p_dog;
  RETURN jsonb_build_object('ok',true,'status','deleted');
 END IF;
 RETURN jsonb_build_object('ok',false,'error','지원하지 않는 작업이에요.');
END;$$;

-- Requires a serialized member wallet, so all stage-one/stage-two coin changes
-- and concurrent draws are serialized by member. Daily draw is replay-safe.
CREATE OR REPLACE FUNCTION public.go_official_draw(p_member uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_today date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
 v_wallet bigint;v_dog uuid;v_slot smallint;v_owned boolean;v_select_owned boolean;
 v_new_cnt integer;v_old_cnt integer;v_power smallint;v_charm smallint;
 v_draw public.go_official_daily_draws%ROWTYPE;v_hidden boolean:=false;v_count integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.go_members WHERE id=p_member AND NOT disabled)
  THEN RETURN jsonb_build_object('ok',false,'error','로그인이 필요해요.'); END IF;
 INSERT INTO public.go_coin_wallets(member_id) VALUES(p_member) ON CONFLICT DO NOTHING;
 SELECT balance INTO v_wallet FROM public.go_coin_wallets WHERE member_id=p_member FOR UPDATE;
 SELECT * INTO v_draw FROM public.go_official_daily_draws
   WHERE member_id=p_member AND local_day=v_today;
 IF FOUND THEN RETURN jsonb_build_object('ok',true,'replayed',true,
   'dogId',v_draw.dog_id,'slot',v_draw.slot,'duplicate',v_draw.duplicate,
   'requiresChoice',(v_draw.duplicate AND v_draw.resolved_at IS NULL),
   'proposedPower',v_draw.proposed_power,'proposedCharm',v_draw.proposed_charm,
   'coinsAdded',0,'balance',v_wallet); END IF;
 SELECT count(*) FILTER(WHERE o.member_id IS NULL),
        count(*) FILTER(WHERE o.member_id IS NOT NULL)
 INTO v_new_cnt,v_old_cnt
 FROM public.go_official_sets s JOIN public.dogs d ON d.id=s.dog_id
 CROSS JOIN generate_series(1,5) AS g(slot)
 LEFT JOIN public.go_official_owned o ON o.member_id=p_member AND o.dog_id=s.dog_id AND o.slot=g.slot
 WHERE s.current_version IS NOT NULL AND NOT s.paused AND d.category='adoption' AND NOT d.adopted;
 IF v_new_cnt+v_old_cnt=0 THEN
  RETURN jsonb_build_object('ok',false,'error','지금 뽑을 수 있는 공식 멍카드가 없어요.'); END IF;
 v_select_owned:=CASE WHEN v_new_cnt=0 THEN true WHEN v_old_cnt=0 THEN false
   ELSE random()>=0.6 END;
 SELECT s.dog_id,g.slot INTO v_dog,v_slot
 FROM public.go_official_sets s JOIN public.dogs d ON d.id=s.dog_id
 CROSS JOIN generate_series(1,5) AS g(slot)
 LEFT JOIN public.go_official_owned o ON o.member_id=p_member AND o.dog_id=s.dog_id AND o.slot=g.slot
 WHERE s.current_version IS NOT NULL AND NOT s.paused AND d.category='adoption' AND NOT d.adopted
  AND (v_select_owned=(o.member_id IS NOT NULL))
 ORDER BY random() LIMIT 1;
 v_owned:=v_select_owned;v_power:=public.go_battle_random_rating();
 v_charm:=public.go_battle_random_rating();
 IF NOT v_owned THEN
  INSERT INTO public.go_official_owned(member_id,dog_id,slot,power,charm)
   VALUES(p_member,v_dog,v_slot,v_power,v_charm);
  SELECT count(*) INTO v_count FROM public.go_official_owned
   WHERE member_id=p_member AND dog_id=v_dog;
  IF v_count=5 THEN
   INSERT INTO public.go_official_hidden(member_id,dog_id) VALUES(p_member,v_dog)
    ON CONFLICT DO NOTHING;
   v_hidden:=true;
  END IF;
 END IF;
 INSERT INTO public.go_official_daily_draws(
  member_id,local_day,dog_id,slot,duplicate,proposed_power,proposed_charm,resolved_at
 ) VALUES(p_member,v_today,v_dog,v_slot,v_owned,
   CASE WHEN v_owned THEN v_power ELSE NULL END,
   CASE WHEN v_owned THEN v_charm ELSE NULL END,
   CASE WHEN v_owned THEN NULL ELSE now() END);
 INSERT INTO public.go_coin_transactions(member_id,amount,event_type,source_key,local_day)
  VALUES(p_member,10,'quest_draw','quest:draw:'||v_today::text,v_today);
 UPDATE public.go_coin_wallets SET balance=balance+10,updated_at=now()
  WHERE member_id=p_member RETURNING balance INTO v_wallet;
 RETURN jsonb_build_object('ok',true,'dogId',v_dog,'slot',v_slot,
  'duplicate',v_owned,'requiresChoice',v_owned,'proposedPower',v_power,
  'proposedCharm',v_charm,'coinsAdded',10,'balance',v_wallet,
  'hiddenUnlocked',v_hidden);
END;$$;

CREATE OR REPLACE FUNCTION public.go_official_resolve_duplicate(
 p_member uuid,p_replace boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_today date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
 v_draw public.go_official_daily_draws%ROWTYPE;v_power smallint;v_charm smallint;
BEGIN
 PERFORM 1 FROM public.go_coin_wallets WHERE member_id=p_member FOR UPDATE;
 SELECT * INTO v_draw FROM public.go_official_daily_draws
  WHERE member_id=p_member AND local_day=v_today FOR UPDATE;
 IF NOT FOUND OR NOT v_draw.duplicate THEN
  RETURN jsonb_build_object('ok',false,'error','비교할 중복 카드가 없어요.'); END IF;
 IF v_draw.resolved_at IS NULL THEN
  IF p_replace THEN UPDATE public.go_official_owned
    SET power=v_draw.proposed_power,charm=v_draw.proposed_charm
    WHERE member_id=p_member AND dog_id=v_draw.dog_id AND slot=v_draw.slot; END IF;
  UPDATE public.go_official_daily_draws SET resolved_at=now()
    WHERE member_id=p_member AND local_day=v_today;
 END IF;
 SELECT power,charm INTO v_power,v_charm FROM public.go_official_owned
  WHERE member_id=p_member AND dog_id=v_draw.dog_id AND slot=v_draw.slot;
 RETURN jsonb_build_object('ok',true,'dogId',v_draw.dog_id,'slot',v_draw.slot,
  'power',v_power,'charm',v_charm,'resolved',true);
END;$$;

CREATE OR REPLACE FUNCTION public.go_official_purchase(
 p_member uuid,p_dog uuid,p_request uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_balance bigint;v_slot smallint;v_result public.go_official_purchases%ROWTYPE;
 v_count integer;v_hidden boolean:=false;v_power smallint;v_charm smallint;
 v_today date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
BEGIN
 IF p_request IS NULL OR NOT EXISTS(SELECT 1 FROM public.go_members WHERE id=p_member AND NOT disabled)
  THEN RETURN jsonb_build_object('ok',false,'error','로그인을 확인해주세요.'); END IF;
 INSERT INTO public.go_coin_wallets(member_id) VALUES(p_member) ON CONFLICT DO NOTHING;
 SELECT balance INTO v_balance FROM public.go_coin_wallets WHERE member_id=p_member FOR UPDATE;
 SELECT * INTO v_result FROM public.go_official_purchases
  WHERE member_id=p_member AND request_id=p_request;
 IF FOUND THEN
  IF v_result.dog_id<>p_dog THEN RETURN jsonb_build_object('ok',false,'error','다른 구매 요청 번호예요.'); END IF;
  RETURN jsonb_build_object('ok',true,'replayed',true,'dogId',v_result.dog_id,
   'slot',v_result.slot,'coinsSpent',0,'balance',v_balance); END IF;
 IF v_balance<200 THEN RETURN jsonb_build_object('ok',false,'error','멍코인이 부족해요.'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.go_official_sets s JOIN public.dogs d ON d.id=s.dog_id
   WHERE s.dog_id=p_dog AND s.current_version IS NOT NULL AND NOT s.paused
   AND d.category='adoption' AND NOT d.adopted) THEN
  RETURN jsonb_build_object('ok',false,'error','현재 구매할 수 없는 멍카드예요.'); END IF;
 SELECT g.slot INTO v_slot FROM generate_series(1,5) g(slot)
  WHERE NOT EXISTS(SELECT 1 FROM public.go_official_owned o
     WHERE o.member_id=p_member AND o.dog_id=p_dog AND o.slot=g.slot)
  ORDER BY random() LIMIT 1;
 IF v_slot IS NULL THEN RETURN jsonb_build_object('ok',false,'error','이 강아지의 사진 5종을 모두 모았어요.'); END IF;
 v_power:=public.go_battle_random_rating();v_charm:=public.go_battle_random_rating();
 INSERT INTO public.go_official_owned(member_id,dog_id,slot,power,charm)
  VALUES(p_member,p_dog,v_slot,v_power,v_charm);
 SELECT count(*) INTO v_count FROM public.go_official_owned WHERE member_id=p_member AND dog_id=p_dog;
 IF v_count=5 THEN
  INSERT INTO public.go_official_hidden(member_id,dog_id) VALUES(p_member,p_dog)
   ON CONFLICT DO NOTHING;
  v_hidden:=true;
 END IF;
 INSERT INTO public.go_official_purchases(member_id,request_id,dog_id,slot)
  VALUES(p_member,p_request,p_dog,v_slot);
 INSERT INTO public.go_coin_transactions(member_id,amount,event_type,source_key,local_day)
  VALUES(p_member,-200,'store_purchase','shop:'||p_request::text,v_today);
 UPDATE public.go_coin_wallets SET balance=balance-200,updated_at=now()
  WHERE member_id=p_member RETURNING balance INTO v_balance;
 RETURN jsonb_build_object('ok',true,'dogId',p_dog,'slot',v_slot,'power',v_power,
   'charm',v_charm,'coinsSpent',200,'balance',v_balance,'hiddenUnlocked',v_hidden);
END;$$;

CREATE OR REPLACE FUNCTION public.go_official_mark_seen(
 p_member uuid,p_dog uuid,p_slot smallint
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF p_slot=6 THEN
  UPDATE public.go_official_hidden SET seen_at=COALESCE(seen_at,now())
   WHERE member_id=p_member AND dog_id=p_dog;
 ELSE
  UPDATE public.go_official_owned SET seen_at=COALESCE(seen_at,now())
   WHERE member_id=p_member AND dog_id=p_dog AND slot=p_slot;
 END IF;
 RETURN FOUND;
END;$$;

CREATE OR REPLACE FUNCTION public.go_camera_create_limited(
 p_member uuid,p_id uuid,p_dog uuid,p_title text,p_image text,
 p_cuteness smallint,p_charm smallint,p_affection smallint
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_day date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
 v_used integer;v_card public.go_cards%ROWTYPE;
BEGIN
 INSERT INTO public.go_coin_wallets(member_id) VALUES(p_member) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.go_coin_wallets WHERE member_id=p_member FOR UPDATE;
 SELECT * INTO v_card FROM public.go_cards WHERE id=p_id;
 IF FOUND THEN
  IF v_card.member_id<>p_member OR v_card.dog_id<>p_dog THEN
   RETURN jsonb_build_object('ok',false,'error','다른 저장 요청과 충돌했어요.'); END IF;
  RETURN jsonb_build_object('ok',true,'id',v_card.id,'replayed',true,'capturedAt',v_card.captured_at);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.dogs WHERE id=p_dog AND category='adoption' AND NOT adopted)
  THEN RETURN jsonb_build_object('ok',false,'error','현재 기록할 수 없는 강아지예요.'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.go_members WHERE id=p_member AND NOT disabled)
  THEN RETURN jsonb_build_object('ok',false,'error','로그인이 필요해요.'); END IF;
 SELECT count(*) INTO v_used FROM public.go_camera_daily_creations
  WHERE member_id=p_member AND local_day=v_day;
 IF v_used>=3 THEN RETURN jsonb_build_object('ok',false,
   'error','오늘 신규 멍카드 3장을 모두 만들었어요. 내일 다시 촬영해주세요.'); END IF;
 INSERT INTO public.go_cards(id,member_id,dog_id,image_path,photo_style,status,title,description,
  cuteness,charm,affection)
 VALUES(p_id,p_member,p_dog,p_image,'original','approved',p_title,p_title,
  p_cuteness,p_charm,p_affection) RETURNING * INTO v_card;
 INSERT INTO public.go_camera_daily_creations(member_id,local_day,card_id) VALUES(p_member,v_day,p_id);
 RETURN jsonb_build_object('ok',true,'id',v_card.id,'capturedAt',v_card.captured_at,
  'remaining',2-v_used);
END;$$;
DO $priv$ DECLARE p text; BEGIN
 FOREACH p IN ARRAY ARRAY[
 'go_official_new_draft(uuid)','go_official_manage(uuid,text,uuid)',
 'go_official_draw(uuid)','go_official_resolve_duplicate(uuid,boolean)',
 'go_official_purchase(uuid,uuid,uuid)','go_official_mark_seen(uuid,uuid,smallint)',
 'go_camera_create_limited(uuid,uuid,uuid,text,text,smallint,smallint,smallint)'
 ] LOOP
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.'||p||' FROM PUBLIC,anon,authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.'||p||' TO service_role';
 END LOOP;
END$priv$;
COMMIT;
