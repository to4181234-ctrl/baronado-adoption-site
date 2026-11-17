-- Stage 4 only. NEVER apply to operating Supabase before the final 2–5 integrated rollout.
-- Precondition: stage 2 4+HIDDEN5 migration, stage 3 economy/coins already applied.
-- The existing go_official_purchases table stores (member_id,request_id,dog_id,slot,coins)
-- and must be reused; no new ownership schema is created.
BEGIN;
-- Add a small audit discriminator to existing receipts. Earlier 200C
-- dog-targeted receipts remain legacy and cannot be replayed as random.
ALTER TABLE public.go_official_purchases
 ADD COLUMN IF NOT EXISTS purchase_mode text;
DO $check$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint
   WHERE conrelid='public.go_official_purchases'::regclass
     AND conname='go_official_purchases_mode_check'
 ) THEN
  ALTER TABLE public.go_official_purchases
    ADD CONSTRAINT go_official_purchases_mode_check
    CHECK (purchase_mode IS NULL OR purchase_mode IN ('random','specific'));
 END IF;
END $check$;
CREATE OR REPLACE FUNCTION public.go_store_purchase(
 p_member uuid,p_request uuid,p_mode text,p_dog uuid DEFAULT NULL,p_slot smallint DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $function$
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
 IF p_mode='specific' AND (p_dog IS NULL OR p_slot IS NULL OR p_slot NOT BETWEEN 1 AND 4) THEN
  RETURN jsonb_build_object('ok',false,'error','구매할 미보유 일반 멍카드를 선택해주세요.');
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
     AND (v_saved.dog_id<>p_dog OR v_saved.slot<>p_slot)) THEN
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
  SELECT d.id,p_slot INTO v_dog,v_slot
  FROM public.dogs d JOIN public.go_official_sets s ON s.dog_id=d.id
   JOIN public.go_official_assets a ON a.version_id=s.current_version AND a.slot=p_slot
  WHERE d.id=p_dog AND d.category='adoption' AND NOT d.adopted
   AND s.current_version IS NOT NULL AND NOT s.paused AND p_slot BETWEEN 1 AND 4
   AND NOT EXISTS(SELECT 1 FROM public.go_official_owned o
     WHERE o.member_id=p_member AND o.dog_id=d.id AND o.slot=p_slot)
  LIMIT 1;
 ELSE
  SELECT d.id,a.slot INTO v_dog,v_slot
  FROM public.dogs d JOIN public.go_official_sets s ON s.dog_id=d.id
  JOIN public.go_official_assets a ON a.version_id=s.current_version
  WHERE d.category='adoption' AND NOT d.adopted AND NOT s.paused
   AND s.current_version IS NOT NULL AND a.slot BETWEEN 1 AND 4
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
REVOKE ALL ON FUNCTION public.go_store_purchase(uuid,uuid,text,uuid,smallint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_store_purchase(uuid,uuid,text,uuid,smallint)
 TO service_role;
COMMIT;
