-- Derived verbatim from current Supabase stored procedures, with only explicit go_dog_release_ready candidate conditions added.
-- Apply only after meonggo-dog-release-gate-20261119-DRAFT.sql.
BEGIN;
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
 WHERE s.current_version IS NOT NULL AND NOT s.paused AND d.category='adoption' AND NOT d.adopted AND public.go_dog_release_ready(s.dog_id);
 IF v_new_cnt+v_old_cnt=0 THEN
  RETURN jsonb_build_object('ok',false,'error','지금 뽑을 수 있는 공식 멍카드가 없어요.'); END IF;
 v_select_owned:=CASE WHEN v_new_cnt=0 THEN true WHEN v_old_cnt=0 THEN false
   ELSE random()>=0.6 END;
 SELECT s.dog_id,g.slot INTO v_dog,v_slot
 FROM public.go_official_sets s JOIN public.dogs d ON d.id=s.dog_id
 CROSS JOIN generate_series(1,4) AS g(slot)
 LEFT JOIN public.go_official_owned o ON o.member_id=p_member AND o.dog_id=s.dog_id AND o.slot=g.slot
 WHERE s.current_version IS NOT NULL AND NOT s.paused AND d.category='adoption' AND NOT d.adopted AND public.go_dog_release_ready(s.dog_id)
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
END;$function$;




CREATE OR REPLACE FUNCTION public.go_official_unlock_hidden(p_member uuid, p_dog uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer;v_inserted integer;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.go_members WHERE id=p_member AND NOT disabled) THEN
  RETURN jsonb_build_object('ok',false,'error','로그인이 필요해요.');
 END IF;
 PERFORM 1 FROM public.go_official_sets WHERE dog_id=p_dog
  AND current_version IS NOT NULL AND public.go_dog_release_ready(p_dog) FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','공식 멍카드가 준비되지 않았어요.'); END IF;
 SELECT count(DISTINCT slot) INTO v_count FROM public.go_official_owned
  WHERE member_id=p_member AND dog_id=p_dog AND slot BETWEEN 1 AND 4;
 IF v_count<>4 THEN RETURN jsonb_build_object('ok',false,'error','일반 멍카드 4종을 먼저 모아주세요.'); END IF;
 INSERT INTO public.go_official_hidden(member_id,dog_id,power,charm)
 VALUES(p_member,p_dog,public.go_battle_random_rating(),public.go_battle_random_rating())
 ON CONFLICT(member_id,dog_id) DO NOTHING;
 GET DIAGNOSTICS v_inserted=ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'unlocked',true,'new',v_inserted=1);
END;$function$;




CREATE OR REPLACE FUNCTION public.go_store_purchase(p_member uuid, p_request uuid, p_mode text, p_dog uuid DEFAULT NULL::uuid, p_slot smallint DEFAULT NULL::smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
 v_balance bigint;v_saved public.go_official_purchases%ROWTYPE;
 v_price integer;v_dog uuid;v_slot smallint;v_power smallint;v_charm smallint;
 v_today date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
BEGIN
 IF p_request IS NULL OR p_mode NOT IN ('random','specific') OR p_mode IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','구매 방식과 요청 번호를 확인해주세요.');
 END IF;
 IF p_mode='random' AND (p_dog IS NOT NULL OR p_slot IS NOT NULL) THEN
  RETURN jsonb_build_object('ok',false,'error','랜덤 구매에는 강아지와 카드 번호를 지정할 수 없어요.');
 END IF;
 IF p_mode='specific' AND (p_dog IS NULL OR p_slot IS NOT NULL) THEN
  RETURN jsonb_build_object('ok',false,'error','지정 뽑기에서는 강아지만 선택해주세요.');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.go_members WHERE id=p_member AND NOT disabled) THEN
  RETURN jsonb_build_object('ok',false,'error','로그인이 필요해요.');
 END IF;
 v_price:=CASE WHEN p_mode='random' THEN 200 ELSE 300 END;
 INSERT INTO public.go_coin_wallets(member_id) VALUES(p_member) ON CONFLICT (member_id) DO NOTHING;
 SELECT balance INTO v_balance FROM public.go_coin_wallets WHERE member_id=p_member FOR UPDATE;
 -- Locking the wallet serializes this member's purchases and prevents a double charge.
 SELECT * INTO v_saved FROM public.go_official_purchases
  WHERE member_id=p_member AND request_id=p_request;
 IF FOUND THEN
  IF v_saved.coins<>v_price OR v_saved.purchase_mode IS DISTINCT FROM p_mode OR (p_mode='specific'
     AND v_saved.dog_id IS DISTINCT FROM p_dog) THEN
   RETURN jsonb_build_object('ok',false,'error','다른 구매에 사용된 요청 번호예요.');
  END IF;
  RETURN jsonb_build_object('ok',true,'replayed',true,
   'dogId',v_saved.dog_id,'slot',v_saved.slot,'coinsSpent',0,
   'price',v_saved.coins,'balance',v_balance);
 END IF;
 IF v_balance<v_price THEN
  RETURN jsonb_build_object('ok',false,'error','멍코인이 부족해요.','balance',v_balance);
 END IF;
 IF p_mode='specific' THEN
  -- Pick an unowned normal card of the user-chosen dog at random (Figma 558:607838).
  SELECT d.id,a.slot INTO v_dog,v_slot
  FROM public.dogs d JOIN public.go_official_sets s ON s.dog_id=d.id
   JOIN public.go_official_assets a ON a.version_id=s.current_version
  WHERE d.id=p_dog AND d.category='adoption' AND NOT d.adopted
   AND s.current_version IS NOT NULL AND NOT s.paused AND a.slot BETWEEN 1 AND 4 AND public.go_dog_release_ready(d.id)
   AND NOT EXISTS(SELECT 1 FROM public.go_official_owned o
     WHERE o.member_id=p_member AND o.dog_id=d.id AND o.slot=a.slot)
  ORDER BY random() LIMIT 1;
 ELSE
  SELECT d.id,a.slot INTO v_dog,v_slot
  FROM public.dogs d JOIN public.go_official_sets s ON s.dog_id=d.id
  JOIN public.go_official_assets a ON a.version_id=s.current_version
  WHERE d.category='adoption' AND NOT d.adopted AND NOT s.paused
   AND s.current_version IS NOT NULL AND a.slot BETWEEN 1 AND 4 AND public.go_dog_release_ready(d.id)
   AND NOT EXISTS(SELECT 1 FROM public.go_official_owned o
     WHERE o.member_id=p_member AND o.dog_id=d.id AND o.slot=a.slot)
  ORDER BY random() LIMIT 1;
 END IF;
 IF v_dog IS NULL OR v_slot IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','지금 구매할 수 있는 미보유 공식 멍카드가 없어요.');
 END IF;
 v_power:=public.go_battle_random_rating();
 v_charm:=public.go_battle_random_rating();
 INSERT INTO public.go_official_owned(member_id,dog_id,slot,power,charm)
  VALUES(p_member,v_dog,v_slot,v_power,v_charm);
 -- HIDDEN slot5 is earned only by a separate user-initiated unlock action.
 INSERT INTO public.go_official_purchases(member_id,request_id,dog_id,slot,coins,purchase_mode)
  VALUES(p_member,p_request,v_dog,v_slot,v_price,p_mode);
 INSERT INTO public.go_coin_transactions(member_id,amount,event_type,source_key,local_day)
  VALUES(p_member,-v_price,'store_purchase','shop:'||p_request::text,v_today);
 UPDATE public.go_coin_wallets SET balance=balance-v_price,updated_at=now()
  WHERE member_id=p_member RETURNING balance INTO v_balance;
 RETURN jsonb_build_object('ok',true,'replayed',false,
   'dogId',v_dog,'slot',v_slot,'power',v_power,'charm',v_charm,
   'coinsSpent',v_price,'price',v_price,'balance',v_balance);
END;$function$;


COMMIT;