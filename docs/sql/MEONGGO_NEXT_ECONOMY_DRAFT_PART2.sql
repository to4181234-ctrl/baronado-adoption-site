
-- Store v2: idempotent 60C / 100C purchases, 60% owned / 40% missing.
-- Legacy 200C/300C receipt replays return their original prices without new debits.
CREATE OR REPLACE FUNCTION public.go_store_purchase_v2(
 p_member uuid,p_request uuid,p_mode text,p_dog uuid DEFAULT NULL,p_slot smallint DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO public AS $$
DECLARE v_day date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
 v_saved public.go_official_purchases%ROWTYPE;v_attempt public.go_draw_attempts%ROWTYPE;
 v_pending uuid;v_balance bigint;v_price integer;
 v_new_cnt integer;v_old_cnt integer;v_owned boolean;
 v_dog uuid;v_slot smallint;v_power smallint;v_charm smallint;v_attempt_id uuid;
BEGIN
 IF p_request IS NULL OR p_mode NOT IN ('random','specific')
    OR (p_mode='random' AND (p_dog IS NOT NULL OR p_slot IS NOT NULL))
    OR (p_mode='specific' AND (p_dog IS NULL OR p_slot IS NOT NULL)) THEN
  RETURN jsonb_build_object('ok',false,'error','구매 방식과 요청 번호를 확인해주세요.'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.go_members WHERE id=p_member AND NOT disabled) THEN
  RETURN jsonb_build_object('ok',false,'error','로그인이 필요해요.'); END IF;
 v_price:=CASE WHEN p_mode='random' THEN 60 ELSE 100 END;
 INSERT INTO public.go_coin_wallets(member_id) VALUES(p_member) ON CONFLICT DO NOTHING;
 SELECT balance INTO v_balance FROM public.go_coin_wallets WHERE member_id=p_member FOR UPDATE;
 SELECT * INTO v_saved FROM public.go_official_purchases WHERE member_id=p_member AND request_id=p_request;
 IF FOUND THEN
  IF (v_saved.purchase_mode IS NOT NULL AND v_saved.purchase_mode<>p_mode)
   OR (p_mode='specific' AND v_saved.dog_id IS DISTINCT FROM p_dog) THEN
   RETURN jsonb_build_object('ok',false,'error','다른 구매에 사용된 요청 번호예요.'); END IF;
  SELECT * INTO v_attempt FROM public.go_draw_attempts
   WHERE member_id=p_member AND source_type='store' AND request_id=p_request;
  RETURN jsonb_build_object('ok',true,'replayed',true,'dogId',v_saved.dog_id,
   'slot',v_saved.slot,'coinsSpent',0,'price',v_saved.coins,'balance',v_balance,
   'requiresChoice',FOUND AND v_attempt.duplicate AND v_attempt.resolved_at IS NULL,
   'choiceId',v_attempt.id);
 END IF;
 SELECT id INTO v_pending FROM public.go_draw_attempts
   WHERE member_id=p_member AND duplicate AND resolved_at IS NULL LIMIT 1;
 IF v_pending IS NOT NULL THEN
  RETURN jsonb_build_object('ok',false,'error','이전 중복 카드부터 선택해주세요.'); END IF;
 IF v_balance<v_price THEN
  RETURN jsonb_build_object('ok',false,'error','멍코인이 부족해요.','balance',v_balance); END IF;
 SELECT count(*) FILTER(WHERE o.member_id IS NULL),count(*) FILTER(WHERE o.member_id IS NOT NULL)
 INTO v_new_cnt,v_old_cnt
 FROM public.go_official_sets s JOIN public.dogs d ON d.id=s.dog_id
 CROSS JOIN generate_series(1,4) AS g(slot)
 LEFT JOIN public.go_official_owned o ON o.member_id=p_member AND o.dog_id=s.dog_id AND o.slot=g.slot
 WHERE s.current_version IS NOT NULL AND NOT s.paused AND d.category='adoption' AND NOT d.adopted
  AND public.go_dog_release_ready(s.dog_id) AND (p_mode='random' OR s.dog_id=p_dog);
 IF v_new_cnt+v_old_cnt=0 THEN
  RETURN jsonb_build_object('ok',false,'error','지금 구매할 수 있는 공식 멍카드가 없어요.'); END IF;
 v_owned:=CASE WHEN v_new_cnt=0 THEN true WHEN v_old_cnt=0 THEN false ELSE random()<0.6 END;
 SELECT s.dog_id,g.slot INTO v_dog,v_slot
 FROM public.go_official_sets s JOIN public.dogs d ON d.id=s.dog_id
 CROSS JOIN generate_series(1,4) AS g(slot)
 LEFT JOIN public.go_official_owned o ON o.member_id=p_member AND o.dog_id=s.dog_id AND o.slot=g.slot
 WHERE s.current_version IS NOT NULL AND NOT s.paused AND d.category='adoption'
  AND NOT d.adopted AND public.go_dog_release_ready(s.dog_id)
  AND (p_mode='random' OR s.dog_id=p_dog)
  AND ((o.member_id IS NOT NULL)=v_owned)
 ORDER BY random() LIMIT 1;
 IF v_dog IS NULL THEN RAISE EXCEPTION 'No eligible store card in bucket'; END IF;
 v_power:=public.go_battle_random_rating();v_charm:=public.go_battle_random_rating();
 IF NOT v_owned THEN
  INSERT INTO public.go_official_owned(member_id,dog_id,slot,power,charm)
   VALUES(p_member,v_dog,v_slot,v_power,v_charm);
 END IF;
 INSERT INTO public.go_official_purchases(member_id,request_id,dog_id,slot,coins,purchase_mode)
 VALUES(p_member,p_request,v_dog,v_slot,v_price,p_mode);
 INSERT INTO public.go_draw_attempts(member_id,source_type,request_id,local_day,dog_id,slot,
  duplicate,proposed_power,proposed_charm,resolved_at)
 VALUES(p_member,'store',p_request,v_day,v_dog,v_slot,v_owned,v_power,v_charm,
  CASE WHEN v_owned THEN NULL ELSE now() END)
 RETURNING id INTO v_attempt_id;
 INSERT INTO public.go_coin_transactions(member_id,amount,event_type,source_key,local_day)
 VALUES(p_member,-v_price,'store_purchase','shop:'||p_request::text,v_day);
 UPDATE public.go_coin_wallets SET balance=balance-v_price,updated_at=now()
  WHERE member_id=p_member RETURNING balance INTO v_balance;
 RETURN jsonb_build_object('ok',true,'replayed',false,'dogId',v_dog,'slot',v_slot,
  'coinsSpent',v_price,'price',v_price,'balance',v_balance,'requiresChoice',v_owned,
  'choiceId',v_attempt_id,'proposedPower',v_power,'proposedCharm',v_charm);
END; $$;
REVOKE ALL ON FUNCTION public.go_store_purchase_v2(uuid,uuid,text,uuid,smallint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_store_purchase_v2(uuid,uuid,text,uuid,smallint) TO service_role;
