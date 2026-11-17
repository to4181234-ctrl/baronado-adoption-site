-- STAGE 2 DRAFT ONLY. DO NOT APPLY TO PRODUCTION BEFORE FINAL RELEASE APPROVAL.
-- Derived from installed Supabase functions and examined 2026-11-17.
BEGIN;
DO $guard$
BEGIN
 IF EXISTS (SELECT 1 FROM public.go_official_owned WHERE slot=5)
 OR EXISTS (SELECT 1 FROM public.go_official_assets WHERE slot=6)
 THEN
  RAISE EXCEPTION '4+1 migration halted: old slot data exists. Review migration first.';
 END IF;
END
$guard$;
ALTER TABLE public.go_official_assets DROP CONSTRAINT go_official_assets_slot_check;
ALTER TABLE public.go_official_assets ADD CONSTRAINT go_official_assets_slot_check CHECK (slot BETWEEN 1 AND 5);
ALTER TABLE public.go_official_assets DROP CONSTRAINT go_official_assets_check;
ALTER TABLE public.go_official_assets ADD CONSTRAINT go_official_assets_check
 CHECK ((slot=5) OR (length(trim(title)) BETWEEN 1 AND 30));
ALTER TABLE public.go_official_owned DROP CONSTRAINT go_official_owned_slot_check;
ALTER TABLE public.go_official_owned ADD CONSTRAINT go_official_owned_slot_check CHECK (slot BETWEEN 1 AND 4);

CREATE OR REPLACE FUNCTION public.go_official_draw(p_member uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
 CROSS JOIN generate_series(1,4) AS g(slot)
 LEFT JOIN public.go_official_owned o ON o.member_id=p_member AND o.dog_id=s.dog_id AND o.slot=g.slot
 WHERE s.current_version IS NOT NULL AND NOT s.paused AND d.category='adoption' AND NOT d.adopted;
 IF v_new_cnt+v_old_cnt=0 THEN
  RETURN jsonb_build_object('ok',false,'error','지금 뽑을 수 있는 공식 멍카드가 없어요.'); END IF;
 v_select_owned:=CASE WHEN v_new_cnt=0 THEN true WHEN v_old_cnt=0 THEN false
   ELSE random()>=0.6 END;
 SELECT s.dog_id,g.slot INTO v_dog,v_slot
 FROM public.go_official_sets s JOIN public.dogs d ON d.id=s.dog_id
 CROSS JOIN generate_series(1,4) AS g(slot)
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
 -- Hidden is claimed only after explicit authenticated click.
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
END;$function$


CREATE OR REPLACE FUNCTION public.go_official_purchase(p_member uuid, p_dog uuid, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
 SELECT g.slot INTO v_slot FROM generate_series(1,4) g(slot)
  WHERE NOT EXISTS(SELECT 1 FROM public.go_official_owned o
     WHERE o.member_id=p_member AND o.dog_id=p_dog AND o.slot=g.slot)
  ORDER BY random() LIMIT 1;
 IF v_slot IS NULL THEN RETURN jsonb_build_object('ok',false,'error','이 강아지의 사진 4종을 모두 모았어요.'); END IF;
 v_power:=public.go_battle_random_rating();v_charm:=public.go_battle_random_rating();
 INSERT INTO public.go_official_owned(member_id,dog_id,slot,power,charm)
  VALUES(p_member,p_dog,v_slot,v_power,v_charm);
 SELECT count(*) INTO v_count FROM public.go_official_owned WHERE member_id=p_member AND dog_id=p_dog;
 -- Hidden is claimed only after explicit authenticated click.
 INSERT INTO public.go_official_purchases(member_id,request_id,dog_id,slot)
  VALUES(p_member,p_request,p_dog,v_slot);
 INSERT INTO public.go_coin_transactions(member_id,amount,event_type,source_key,local_day)
  VALUES(p_member,-200,'store_purchase','shop:'||p_request::text,v_today);
 UPDATE public.go_coin_wallets SET balance=balance-200,updated_at=now()
  WHERE member_id=p_member RETURNING balance INTO v_balance;
 RETURN jsonb_build_object('ok',true,'dogId',p_dog,'slot',v_slot,'power',v_power,
   'charm',v_charm,'coinsSpent',200,'balance',v_balance,'hiddenUnlocked',v_hidden);
END;$function$


CREATE OR REPLACE FUNCTION public.go_official_manage(p_dog uuid, p_action text, p_draft uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
  IF v_count<>5 THEN RETURN jsonb_build_object('ok',false,'error','사진 4종과 HIDDEN 일러스트를 모두 등록해주세요.'); END IF;
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
  SELECT EXISTS(SELECT 1 FROM public.go_official_issuance_markers WHERE dog_id=p_dog)
      OR EXISTS(SELECT 1 FROM public.go_official_owned WHERE dog_id=p_dog)
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
END;$function$


CREATE OR REPLACE FUNCTION public.go_official_mark_seen(p_member uuid, p_dog uuid, p_slot smallint)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
 IF p_slot=5 THEN
  UPDATE public.go_official_hidden SET seen_at=COALESCE(seen_at,now())
   WHERE member_id=p_member AND dog_id=p_dog;
 ELSE
  UPDATE public.go_official_owned SET seen_at=COALESCE(seen_at,now())
   WHERE member_id=p_member AND dog_id=p_dog AND slot=p_slot;
 END IF;
 RETURN FOUND;
END;$function$



-- Server-only RPC; member identity supplied only by authenticated API.
CREATE OR REPLACE FUNCTION public.go_official_unlock_hidden(p_member uuid, p_dog uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE v_count integer; v_inserted integer;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.go_members WHERE id=p_member AND NOT disabled) THEN
  RETURN jsonb_build_object('ok',false,'error','로그인이 필요해요.');
 END IF;
 PERFORM 1 FROM public.go_official_sets WHERE dog_id=p_dog
  AND current_version IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN
  RETURN jsonb_build_object('ok',false,'error','공식 멍카드가 준비되지 않았어요.');
 END IF;
 SELECT count(DISTINCT slot) INTO v_count FROM public.go_official_owned
  WHERE member_id=p_member AND dog_id=p_dog AND slot BETWEEN 1 AND 4;
 IF v_count <> 4 THEN
  RETURN jsonb_build_object('ok',false,'error','일반 멍카드 4종을 먼저 모아주세요.');
 END IF;
 INSERT INTO public.go_official_hidden(member_id,dog_id)
  VALUES(p_member,p_dog) ON CONFLICT (member_id,dog_id) DO NOTHING;
 GET DIAGNOSTICS v_inserted = ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'unlocked',true,'new',v_inserted=1);
END;$function$;
-- Preserve dog-level battle/interaction records while an official card remains.
-- The final card rule must consider both card types, not just camera cards.
CREATE OR REPLACE FUNCTION public.go_battle_cleanup_last_card()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE deleted_dog text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.go_cards
  WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id AND status='approved')
 AND NOT EXISTS(SELECT 1 FROM public.go_official_owned
  WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id)
 AND NOT EXISTS(SELECT 1 FROM public.go_official_hidden
  WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id) THEN
   DELETE FROM public.go_battles WHERE member_id=OLD.member_id
    AND (first_dog_id=OLD.dog_id OR second_dog_id=OLD.dog_id);
   DELETE FROM public.go_interactions WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id;
   DELETE FROM public.go_affinity WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id;
   SELECT name INTO deleted_dog FROM public.dogs WHERE id=OLD.dog_id;
   UPDATE public.go_members SET avatar_dog=NULL
    WHERE id=OLD.member_id AND avatar_dog=deleted_dog;
 END IF;
 RETURN OLD;
END;$function$;

REVOKE ALL ON FUNCTION public.go_official_unlock_hidden(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.go_official_unlock_hidden(uuid,uuid) TO service_role;
COMMIT;
