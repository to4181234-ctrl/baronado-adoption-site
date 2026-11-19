-- MeongGO 2.0 next-update economy, review-only schema patch.
-- DO NOT APPLY TO PRODUCTION. Requires isolated PostgreSQL test and approval.
-- Migrates no stored coin balances, does not delete owned cards or historical purchases.
BEGIN;

-- New unified issuance/duplicate ledger. Older daily draws and purchases remain intact.
CREATE TABLE IF NOT EXISTS public.go_draw_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 source_type text NOT NULL CHECK(source_type IN ('free','store','legacy')),
 request_id uuid NOT NULL,
 local_day date NOT NULL,
 dog_id uuid NOT NULL REFERENCES public.go_official_sets(dog_id) ON DELETE RESTRICT,
 slot smallint NOT NULL CHECK(slot BETWEEN 1 AND 4),
 duplicate boolean NOT NULL,
 proposed_power smallint NOT NULL CHECK(proposed_power BETWEEN 1 AND 5),
 proposed_charm smallint NOT NULL CHECK(proposed_charm BETWEEN 1 AND 5),
 resolved_at timestamptz,
 replaced boolean,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT go_draw_attempts_request_unique UNIQUE(member_id,source_type,request_id),
 CONSTRAINT go_draw_attempts_choice_consistent CHECK (
  (NOT duplicate AND resolved_at IS NOT NULL AND replaced IS NULL)
  OR (duplicate AND ((resolved_at IS NULL AND replaced IS NULL) OR
                      (resolved_at IS NOT NULL AND replaced IS NOT NULL)))
 )
);
CREATE INDEX IF NOT EXISTS go_draw_attempts_member_day_idx
 ON public.go_draw_attempts(member_id,local_day,source_type);
CREATE UNIQUE INDEX IF NOT EXISTS go_draw_attempts_one_unresolved_per_member
 ON public.go_draw_attempts(member_id) WHERE duplicate AND resolved_at IS NULL;
ALTER TABLE public.go_draw_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_draw_attempts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.go_draw_attempts TO service_role;

-- Historical pending free duplicate choices must survive the rollout.
INSERT INTO public.go_draw_attempts(member_id,source_type,request_id,local_day,dog_id,slot,
 duplicate,proposed_power,proposed_charm)
SELECT DISTINCT ON (d.member_id) d.member_id,'legacy',gen_random_uuid(),d.local_day,d.dog_id,d.slot,
 true,d.proposed_power,d.proposed_charm
FROM public.go_official_daily_draws d
WHERE d.duplicate AND d.resolved_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.go_draw_attempts a
    WHERE a.member_id=d.member_id AND a.source_type='legacy' AND a.local_day=d.local_day
      AND a.dog_id=d.dog_id AND a.slot=d.slot
  )
ORDER BY d.member_id,d.local_day DESC;

ALTER TABLE public.go_official_purchases DROP CONSTRAINT IF EXISTS go_official_purchases_coins_check;
ALTER TABLE public.go_official_purchases ADD CONSTRAINT go_official_purchases_coins_check
 CHECK (coins IN (60,100,200,300));

ALTER TABLE public.go_coin_transactions DROP CONSTRAINT IF EXISTS go_coin_transactions_event_type_check;
ALTER TABLE public.go_coin_transactions ADD CONSTRAINT go_coin_transactions_event_type_check
 CHECK (event_type IN ('care','quest_care','quest_visit','visit_reversal','store_purchase',
  'quest_draw','quest_battle','admin_grant','battle_win'));

-- Per-completed-battle settlement marker, INCLUDING 0C outcomes.
CREATE TABLE IF NOT EXISTS public.go_battle_reward_claims (
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 battle_kind text NOT NULL CHECK (battle_kind IN ('random','pvp')),
 battle_key text NOT NULL CHECK (length(battle_key) BETWEEN 1 AND 150),
 local_day date NOT NULL,
 coins integer NOT NULL CHECK (coins IN (0,3,10)),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(member_id,battle_kind,battle_key)
);
ALTER TABLE public.go_battle_reward_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_battle_reward_claims FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.go_battle_reward_claims TO service_role;
-- Backfill avoids retroactive +3C when old completed battles are replayed after migration.
INSERT INTO public.go_battle_reward_claims(member_id,battle_kind,battle_key,local_day,coins)
SELECT member_id,'random',id::text,(created_at AT TIME ZONE 'Asia/Seoul')::date,0
FROM public.go_battles ON CONFLICT DO NOTHING;
INSERT INTO public.go_battle_reward_claims(member_id,battle_kind,battle_key,local_day,coins)
SELECT member_id,'pvp',room_id::text||':'||round_number::text,
       (finished_at AT TIME ZONE 'Asia/Seoul')::date,0
FROM public.go_pvp_records ON CONFLICT DO NOTHING;

-- Atomic settlement; the same wallet row lock serializes random and PvP results.
CREATE OR REPLACE FUNCTION public.go_battle_award_result(
 p_member uuid,p_kind text,p_battle_key text,p_won boolean
) RETURNS integer LANGUAGE plpgsql SET search_path TO public AS $$
DECLARE v_day date := (now() AT TIME ZONE 'Asia/Seoul')::date;
 v_prior integer;v_first uuid;v_amount integer:=0;
BEGIN
 IF p_kind NOT IN ('random','pvp') OR p_battle_key IS NULL OR length(p_battle_key)>150 THEN
  RAISE EXCEPTION 'Invalid battle award identity';
 END IF;
 INSERT INTO public.go_coin_wallets(member_id) VALUES(p_member) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.go_coin_wallets WHERE member_id=p_member FOR UPDATE;
 SELECT coins INTO v_prior FROM public.go_battle_reward_claims
  WHERE member_id=p_member AND battle_kind=p_kind AND battle_key=p_battle_key;
 IF FOUND THEN RETURN 0; END IF;
 INSERT INTO public.go_coin_transactions(member_id,amount,event_type,source_key,local_day)
 VALUES(p_member,10,'quest_battle','quest:battle:'||v_day::text,v_day)
 ON CONFLICT(member_id,source_key) DO NOTHING RETURNING id INTO v_first;
 IF v_first IS NOT NULL THEN
  v_amount:=10; -- First battle: 10C only, even when won.
 ELSIF COALESCE(p_won,false) THEN
  INSERT INTO public.go_coin_transactions(member_id,amount,event_type,source_key,local_day)
  VALUES(p_member,3,'battle_win','battle:'||p_kind||':'||p_battle_key,v_day);
  v_amount:=3;
 END IF;
 INSERT INTO public.go_battle_reward_claims(member_id,battle_kind,battle_key,local_day,coins)
 VALUES(p_member,p_kind,p_battle_key,v_day,v_amount);
 IF v_amount>0 THEN
  UPDATE public.go_coin_wallets SET balance=balance+v_amount,updated_at=now()
   WHERE member_id=p_member;
 END IF;
 RETURN v_amount;
END; $$;
REVOKE ALL ON FUNCTION public.go_battle_award_result(uuid,text,text,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_battle_award_result(uuid,text,text,boolean) TO service_role;

-- Existing random battle RPC is retained for existing API callers.
CREATE OR REPLACE FUNCTION public.go_battle_reward_random(
 p_member uuid,p_battle uuid
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO public AS $$
DECLARE v_battle public.go_battles%ROWTYPE;v_added integer;v_balance bigint;
BEGIN
 SELECT * INTO v_battle FROM public.go_battles WHERE id=p_battle AND member_id=p_member;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,
   'error','확정된 본인 대결만 보상받을 수 있어요.'); END IF;
 v_added:=public.go_battle_award_result(p_member,'random',p_battle::text,v_battle.winner='first');
 SELECT balance INTO v_balance FROM public.go_coin_wallets WHERE member_id=p_member;
 RETURN jsonb_build_object('ok',true,'coinsAdded',v_added,'balance',v_balance);
END; $$;

-- Daily allowance counts both historical legacy draw and new attempts.
CREATE OR REPLACE FUNCTION public.go_official_draw_v2(
 p_member uuid,p_request uuid
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO public AS $$
DECLARE v_day date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
 v_count integer;v_new_cnt integer;v_old_cnt integer;
 v_owned boolean;v_dog uuid;v_slot smallint;v_power smallint;v_charm smallint;
 v_existing public.go_draw_attempts%ROWTYPE;v_pending uuid;v_attempt uuid;
BEGIN
 IF p_request IS NULL THEN RETURN jsonb_build_object('ok',false,'error','뽑기 요청 번호를 확인해주세요.'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.go_members WHERE id=p_member AND NOT disabled) THEN
  RETURN jsonb_build_object('ok',false,'error','로그인이 필요해요.'); END IF;
 INSERT INTO public.go_coin_wallets(member_id) VALUES(p_member) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.go_coin_wallets WHERE member_id=p_member FOR UPDATE;
 SELECT * INTO v_existing FROM public.go_draw_attempts
  WHERE member_id=p_member AND source_type='free' AND request_id=p_request;
 IF FOUND THEN
  RETURN jsonb_build_object('ok',true,'replayed',true,'drawId',v_existing.id,
    'dogId',v_existing.dog_id,'slot',v_existing.slot,'duplicate',v_existing.duplicate,
    'requiresChoice',v_existing.duplicate AND v_existing.resolved_at IS NULL,
    'proposedPower',v_existing.proposed_power,'proposedCharm',v_existing.proposed_charm,
    'coinsAdded',0);
 END IF;
 SELECT id INTO v_pending FROM public.go_draw_attempts WHERE member_id=p_member
  AND duplicate AND resolved_at IS NULL LIMIT 1;
 IF v_pending IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'error','이전 중복 카드부터 선택해주세요.'); END IF;
 SELECT (SELECT count(*) FROM public.go_official_daily_draws WHERE member_id=p_member AND local_day=v_day)
      +(SELECT count(*) FROM public.go_draw_attempts WHERE member_id=p_member AND source_type='free' AND local_day=v_day)
  INTO v_count;
 IF v_count>=2 THEN RETURN jsonb_build_object('ok',false,'error','오늘의 무료 뽑기 2회를 모두 사용했어요.'); END IF;
 SELECT count(*) FILTER(WHERE o.member_id IS NULL),count(*) FILTER(WHERE o.member_id IS NOT NULL)
 INTO v_new_cnt,v_old_cnt
 FROM public.go_official_sets s JOIN public.dogs d ON d.id=s.dog_id
 CROSS JOIN generate_series(1,4) AS g(slot)
 LEFT JOIN public.go_official_owned o ON o.member_id=p_member AND o.dog_id=s.dog_id AND o.slot=g.slot
 WHERE s.current_version IS NOT NULL AND NOT s.paused AND d.category='adoption'
  AND NOT d.adopted AND public.go_dog_release_ready(s.dog_id);
 IF v_new_cnt+v_old_cnt=0 THEN
  RETURN jsonb_build_object('ok',false,'error','현재 뽑을 수 있는 공식 멍카드가 없어요.'); END IF;
 v_owned:=CASE WHEN v_new_cnt=0 THEN true WHEN v_old_cnt=0 THEN false ELSE random()<0.6 END;
 SELECT s.dog_id,g.slot INTO v_dog,v_slot
 FROM public.go_official_sets s JOIN public.dogs d ON d.id=s.dog_id
 CROSS JOIN generate_series(1,4) AS g(slot)
 LEFT JOIN public.go_official_owned o ON o.member_id=p_member AND o.dog_id=s.dog_id AND o.slot=g.slot
 WHERE s.current_version IS NOT NULL AND NOT s.paused AND d.category='adoption'
  AND NOT d.adopted AND public.go_dog_release_ready(s.dog_id)
  AND ((o.member_id IS NOT NULL)=v_owned)
 ORDER BY random() LIMIT 1;
 IF v_dog IS NULL THEN RAISE EXCEPTION 'No eligible official card in bucket'; END IF;
 v_power:=public.go_battle_random_rating();v_charm:=public.go_battle_random_rating();
 IF NOT v_owned THEN
  INSERT INTO public.go_official_owned(member_id,dog_id,slot,power,charm)
   VALUES(p_member,v_dog,v_slot,v_power,v_charm);
 END IF;
 INSERT INTO public.go_draw_attempts(member_id,source_type,request_id,local_day,
  dog_id,slot,duplicate,proposed_power,proposed_charm,resolved_at)
 VALUES(p_member,'free',p_request,v_day,v_dog,v_slot,v_owned,v_power,v_charm,
  CASE WHEN v_owned THEN NULL ELSE now() END) RETURNING id INTO v_attempt;
 RETURN jsonb_build_object('ok',true,'drawId',v_attempt,'dogId',v_dog,'slot',v_slot,
  'duplicate',v_owned,'requiresChoice',v_owned,'proposedPower',v_power,
  'proposedCharm',v_charm,'coinsAdded',0);
END; $$;
REVOKE ALL ON FUNCTION public.go_official_draw_v2(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_official_draw_v2(uuid,uuid) TO service_role;

-- Deployment compatibility for an older browser still calling the one-argument RPC.
-- Deterministic per-member/KST-day request UUID prevents duplicate free issues.
CREATE OR REPLACE FUNCTION public.go_official_draw(
 p_member uuid
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO public AS $
DECLARE v_day date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
 v_hash text;v_request uuid;
BEGIN
 v_hash:=md5('legacy-free:'||p_member::text||':'||v_day::text);
 v_request:=(substr(v_hash,1,8)||'-'||substr(v_hash,9,4)||'-'||
  substr(v_hash,13,4)||'-'||substr(v_hash,17,4)||'-'||substr(v_hash,21,12))::uuid;
 RETURN public.go_official_draw_v2(p_member,v_request);
END; $;

-- Resolve by a durable issued-attempt ID (not by today's date).
-- A user-clicked close invokes p_replace=false. Network errors leave the choice pending.
CREATE OR REPLACE FUNCTION public.go_official_resolve_duplicate_v2(
 p_member uuid,p_attempt uuid,p_replace boolean
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO public AS $$
DECLARE v_attempt public.go_draw_attempts%ROWTYPE;v_power smallint;v_charm smallint;
BEGIN
 IF p_attempt IS NULL OR p_replace IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','비교할 멍카드를 확인해주세요.'); END IF;
 PERFORM 1 FROM public.go_coin_wallets WHERE member_id=p_member FOR UPDATE;
 SELECT * INTO v_attempt FROM public.go_draw_attempts
   WHERE id=p_attempt AND member_id=p_member FOR UPDATE;
 IF NOT FOUND OR NOT v_attempt.duplicate THEN
  RETURN jsonb_build_object('ok',false,'error','비교할 중복 카드가 없어요.'); END IF;
 IF v_attempt.resolved_at IS NULL THEN
  IF p_replace THEN
   UPDATE public.go_official_owned SET power=v_attempt.proposed_power,charm=v_attempt.proposed_charm
    WHERE member_id=p_member AND dog_id=v_attempt.dog_id AND slot=v_attempt.slot;
   IF NOT FOUND THEN RAISE EXCEPTION 'Original card no longer exists'; END IF;
  END IF;
  UPDATE public.go_draw_attempts SET resolved_at=now(),replaced=p_replace WHERE id=v_attempt.id;
  IF v_attempt.source_type='legacy' THEN
   UPDATE public.go_official_daily_draws SET resolved_at=now()
    WHERE member_id=p_member AND local_day=v_attempt.local_day AND resolved_at IS NULL;
  END IF;
 END IF;
 SELECT power,charm INTO v_power,v_charm FROM public.go_official_owned
  WHERE member_id=p_member AND dog_id=v_attempt.dog_id AND slot=v_attempt.slot;
 RETURN jsonb_build_object('ok',true,'dogId',v_attempt.dog_id,'slot',v_attempt.slot,
  'power',v_power,'charm',v_charm,'resolved',true);
END; $$;
REVOKE ALL ON FUNCTION public.go_official_resolve_duplicate_v2(uuid,uuid,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_official_resolve_duplicate_v2(uuid,uuid,boolean) TO service_role;



-- An in-flight older browser may call the original two-argument resolution RPC.
-- Resolve the same oldest outstanding attempt without guessing from local-day.
CREATE OR REPLACE FUNCTION public.go_official_resolve_duplicate(
 p_member uuid,p_replace boolean
) RETURNS jsonb LANGUAGE plpgsql SET search_path TO public AS $
DECLARE v_attempt uuid;
BEGIN
 SELECT id INTO v_attempt FROM public.go_draw_attempts
  WHERE member_id=p_member AND duplicate AND resolved_at IS NULL
  ORDER BY created_at LIMIT 1;
 IF v_attempt IS NULL THEN
  RETURN jsonb_build_object('ok',false,'error','비교할 중복 카드가 없어요.'); END IF;
 RETURN public.go_official_resolve_duplicate_v2(p_member,v_attempt,p_replace);
END; $;

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


-- Existing PvP RPC, amended only at the 1v1 round reward block.
CREATE OR REPLACE FUNCTION public.go_pvp_action(p_member uuid, p_room uuid, p_action text, p_kind text DEFAULT NULL::text, p_card uuid DEFAULT NULL::uuid, p_slot smallint DEFAULT NULL::smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_room public.go_pvp_rooms%ROWTYPE;v_round public.go_pvp_rounds%ROWTYPE;
 v_host boolean;v_card jsonb;v_score_h integer;v_score_g integer;v_winner text;
 v_day date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
 v_player uuid;v_new_reward uuid;v_coin_added integer:=0;
 v_host_name text;v_guest_name text;v_award integer:=0;
BEGIN
 SELECT * INTO v_room FROM public.go_pvp_rooms WHERE id=p_room FOR UPDATE;
 IF NOT FOUND OR (p_member IS DISTINCT FROM v_room.host_id AND p_member IS DISTINCT FROM v_room.guest_id) THEN
  RETURN jsonb_build_object('ok',false,'error','참가자만 대결을 변경할 수 있어요.');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.go_members WHERE id=p_member AND NOT disabled) THEN
  RETURN jsonb_build_object('ok',false,'error','계정을 확인해주세요.');
 END IF;
 v_host:=(p_member=v_room.host_id);
 -- Timeout checks precede any heartbeat to avoid reviving already-dead sessions.
 IF v_room.status='waiting' AND v_room.invite_expires_at<=now() THEN
  UPDATE public.go_pvp_rooms SET status='cancelled',updated_at=now() WHERE id=p_room;
  v_room.status:='cancelled';
 ELSIF v_room.status='playing' AND (
  v_room.ready_deadline<=now() OR
  v_room.host_seen_at<now()-interval '30 seconds' OR
  v_room.guest_seen_at<now()-interval '30 seconds'
 ) THEN
  UPDATE public.go_pvp_rooms SET status='cancelled',updated_at=now() WHERE id=p_room;
  v_room.status:='cancelled';
 END IF;
 IF p_action='leave' AND v_room.status IN ('waiting','playing','completed') THEN
  UPDATE public.go_pvp_rooms SET status='cancelled',updated_at=now() WHERE id=p_room;
  RETURN jsonb_build_object('ok',true,'status','cancelled');
 END IF;
 IF v_room.status='cancelled' THEN
  IF p_action='sync' THEN RETURN jsonb_build_object('ok',true,'status','cancelled'); END IF;
  RETURN jsonb_build_object('ok',false,'error','대결이 종료됐어요. 새로운 방을 만들어주세요.');
 END IF;
 -- When either peer stops heartbeating for >15 s, revoke both READY flags.
 -- They can rejoin the SAME room inside the existing 30-second grace period
 -- and must each explicitly READY again; no automatic score or reward.
 IF v_room.status='playing' AND (
    v_room.host_seen_at < now()-interval '15 seconds' OR
    v_room.guest_seen_at < now()-interval '15 seconds'
 ) THEN
  UPDATE public.go_pvp_rounds SET host_ready=false,guest_ready=false
   WHERE room_id=p_room AND round_number=v_room.round_number
     AND (host_ready OR guest_ready);
 END IF;
 IF v_host THEN
  UPDATE public.go_pvp_rooms SET host_seen_at=now(),updated_at=now() WHERE id=p_room;
 ELSE
  UPDATE public.go_pvp_rooms SET guest_seen_at=now(),updated_at=now() WHERE id=p_room;
 END IF;
 IF p_action='sync' THEN RETURN jsonb_build_object('ok',true,'status',v_room.status); END IF;
 IF p_action IN ('select','ready','unready') THEN
  IF v_room.status<>'playing' OR v_room.guest_id IS NULL THEN
   RETURN jsonb_build_object('ok',false,'error','친구가 참가한 진행 중인 방에서만 카드를 선택할 수 있어요.'); END IF;
  SELECT * INTO v_round FROM public.go_pvp_rounds WHERE room_id=p_room
   AND round_number=v_room.round_number FOR UPDATE;
  IF p_action='select' THEN
   IF (v_host AND v_round.host_ready) OR (NOT v_host AND v_round.guest_ready) THEN
    RETURN jsonb_build_object('ok',false,'error','준비 완료를 취소한 후 카드를 바꿔주세요.'); END IF;
   v_card:=public.go_pvp_card_snapshot(p_member,p_kind,p_card,p_slot);
   IF v_card IS NULL THEN RETURN jsonb_build_object('ok',false,'error','본인이 보유한 출전 가능한 카드만 선택할 수 있어요.'); END IF;
   IF v_host THEN UPDATE public.go_pvp_rounds SET host_card=v_card WHERE room_id=p_room AND round_number=v_room.round_number;
   ELSE UPDATE public.go_pvp_rounds SET guest_card=v_card WHERE room_id=p_room AND round_number=v_room.round_number; END IF;
   RETURN jsonb_build_object('ok',true,'status','selected');
  ELSIF p_action='unready' THEN
   IF v_host THEN UPDATE public.go_pvp_rounds SET host_ready=false WHERE room_id=p_room AND round_number=v_room.round_number;
   ELSE UPDATE public.go_pvp_rounds SET guest_ready=false WHERE room_id=p_room AND round_number=v_room.round_number; END IF;
   RETURN jsonb_build_object('ok',true,'status','unready');
  ELSIF p_action='ready' THEN
   v_card:=CASE WHEN v_host THEN v_round.host_card ELSE v_round.guest_card END;
   IF v_card IS NULL THEN RETURN jsonb_build_object('ok',false,'error','먼저 출전할 카드를 선택해주세요.'); END IF;
   -- Refresh server-side snapshot before locking readiness; no client-supplied ratings.
   v_card:=public.go_pvp_card_snapshot(p_member,v_card->>'kind',(v_card->>'cardId')::uuid,
      NULLIF(v_card->>'slot','')::smallint);
   IF v_card IS NULL THEN RETURN jsonb_build_object('ok',false,'error','보유하지 않은 카드는 출전할 수 없어요.'); END IF;
   IF v_host THEN UPDATE public.go_pvp_rounds SET host_card=v_card,host_ready=true WHERE room_id=p_room AND round_number=v_room.round_number;
   ELSE UPDATE public.go_pvp_rounds SET guest_card=v_card,guest_ready=true WHERE room_id=p_room AND round_number=v_room.round_number; END IF;
   SELECT * INTO v_round FROM public.go_pvp_rounds WHERE room_id=p_room AND round_number=v_room.round_number FOR UPDATE;
   IF v_round.host_ready AND v_round.guest_ready THEN
    v_score_h:=(v_round.host_card->>'power')::integer+(v_round.host_card->>'charm')::integer;
    v_score_g:=(v_round.guest_card->>'power')::integer+(v_round.guest_card->>'charm')::integer;
    v_winner:=CASE WHEN v_score_h=v_score_g THEN 'draw' WHEN v_score_h>v_score_g THEN 'host' ELSE 'guest' END;
    UPDATE public.go_pvp_rounds SET winner=v_winner,host_score=v_score_h,
     guest_score=v_score_g,finished_at=now()
     WHERE room_id=p_room AND round_number=v_room.round_number;
    UPDATE public.go_pvp_rooms SET status='completed',ready_deadline=NULL,updated_at=now() WHERE id=p_room;
    SELECT nickname INTO v_host_name FROM public.go_members WHERE id=v_room.host_id;
    SELECT nickname INTO v_guest_name FROM public.go_members WHERE id=v_room.guest_id;
    INSERT INTO public.go_pvp_records(member_id,opponent_id,opponent_name,room_id,
      round_number,outcome,my_score,opponent_score)
    VALUES
     (v_room.host_id,v_room.guest_id,COALESCE(v_guest_name,'멍기록가'),p_room,v_room.round_number,
      CASE WHEN v_winner='draw' THEN 'draw' WHEN v_winner='host' THEN 'win' ELSE 'loss' END,v_score_h,v_score_g),
     (v_room.guest_id,v_room.host_id,COALESCE(v_host_name,'멍기록가'),p_room,v_room.round_number,
      CASE WHEN v_winner='draw' THEN 'draw' WHEN v_winner='guest' THEN 'win' ELSE 'loss' END,v_score_g,v_score_h);
    -- Serialized, idempotent per-account per-round rewards.
    FOR v_player IN SELECT unnest(ARRAY[v_room.host_id,v_room.guest_id]) ORDER BY 1 LOOP
     v_award:=public.go_battle_award_result(v_player,'pvp',
       p_room::text||':'||v_room.round_number::text,
       (v_winner='host' AND v_player=v_room.host_id)
        OR (v_winner='guest' AND v_player=v_room.guest_id));
     IF v_player=p_member THEN v_coin_added:=v_award; END IF;
    END LOOP;
    RETURN jsonb_build_object('ok',true,'status','completed','coinAdded',v_coin_added);
   END IF;
   RETURN jsonb_build_object('ok',true,'status','ready');
  END IF;
 ELSIF p_action='rematch' THEN
  IF v_room.status<>'completed' THEN RETURN jsonb_build_object('ok',false,'error','완료한 대결에서만 재대결할 수 있어요.'); END IF;
  IF v_host THEN
   UPDATE public.go_pvp_rooms SET host_rematch=true,updated_at=now() WHERE id=p_room;
  ELSE
   UPDATE public.go_pvp_rooms SET guest_rematch=true,updated_at=now() WHERE id=p_room;
  END IF;
  SELECT * INTO v_room FROM public.go_pvp_rooms WHERE id=p_room;
  IF v_room.host_rematch AND v_room.guest_rematch THEN
   INSERT INTO public.go_pvp_rounds(room_id,round_number) VALUES(p_room,v_room.round_number+1);
   UPDATE public.go_pvp_rooms SET status='playing',round_number=v_room.round_number+1,
    ready_deadline=now()+interval '2 minutes',host_rematch=false,guest_rematch=false,updated_at=now()
    WHERE id=p_room;
   RETURN jsonb_build_object('ok',true,'status','playing','round',v_room.round_number+1);
  END IF;
  RETURN jsonb_build_object('ok',true,'status','waiting-rematch');
 END IF;
 RETURN jsonb_build_object('ok',false,'error','지원하지 않는 대결 작업이에요.');
END;$function$;


COMMIT;
