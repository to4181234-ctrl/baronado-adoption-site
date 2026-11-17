-- MeongGO 2.0 STAGE 3 DRAFT, production execution prohibited without final 2-5 integrated release approval.
-- Read-only introspection from production definitions on 2026-11-17.
-- Apply in order after stage2-four-plus-one-DRAFT.sql, since go_official_* tables must already exist.
-- Preserves existing go_cards and all pre-existing member wallets/transactions.
BEGIN;
CREATE OR REPLACE FUNCTION public.go_do_interaction(p_member_id uuid, p_dog_id uuid, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
 current_level integer;
 used_today integer;
 since_last timestamptz;
 daily_gain integer;
 korea_day timestamptz;
 next_level integer;
BEGIN
 IF p_action NOT IN ('snack','praise','play') THEN RAISE EXCEPTION 'unknown action'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.go_members WHERE id=p_member_id AND NOT disabled) THEN RAISE EXCEPTION 'unknown member'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.dogs WHERE id=p_dog_id AND category='adoption') THEN RAISE EXCEPTION 'unknown dog'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.go_cards
  WHERE member_id=p_member_id AND dog_id=p_dog_id AND status='approved')
 AND NOT EXISTS(SELECT 1 FROM public.go_official_owned
  WHERE member_id=p_member_id AND dog_id=p_dog_id)
 AND NOT EXISTS(SELECT 1 FROM public.go_official_hidden
  WHERE member_id=p_member_id AND dog_id=p_dog_id)
 THEN
  RETURN jsonb_build_object('ok',false,'error','먼저 강아지 카드를 수집해주세요.');
 END IF;
 INSERT INTO public.go_affinity(member_id,dog_id,level) VALUES(p_member_id,p_dog_id,0) ON CONFLICT DO NOTHING;
 SELECT level INTO current_level FROM public.go_affinity WHERE member_id=p_member_id AND dog_id=p_dog_id FOR UPDATE;
 korea_day= date_trunc('day',now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
 SELECT count(*),max(created_at) INTO used_today,since_last
 FROM public.go_interactions WHERE member_id=p_member_id AND dog_id=p_dog_id AND action=p_action AND created_at>=korea_day;
 IF used_today>=2 THEN RETURN jsonb_build_object('ok',false,'error','오늘은 이 교감을 모두 사용했어요.','remaining',0,'level',current_level); END IF;
 IF since_last>now()-interval '30 minutes' THEN RETURN jsonb_build_object('ok',false,'error','30분 뒤에 다시 교감할 수 있어요.','remaining',2-used_today,'level',current_level,'availableAt',since_last+interval '30 minutes'); END IF;
 SELECT count(*) INTO daily_gain FROM public.go_interactions WHERE member_id=p_member_id AND dog_id=p_dog_id AND created_at>=korea_day;
 next_level=LEAST(10,current_level+CASE WHEN daily_gain<3 THEN 1 ELSE 0 END);
 INSERT INTO public.go_interactions(member_id,dog_id,action) VALUES(p_member_id,p_dog_id,p_action);
 UPDATE public.go_affinity SET level=next_level,updated_at=now() WHERE member_id=p_member_id AND dog_id=p_dog_id;
 RETURN jsonb_build_object('ok',true,'level',next_level,'increased',next_level>current_level,'remaining',1-used_today,'availableAt',now()+interval '30 minutes');
END;
$function$;

CREATE OR REPLACE FUNCTION public.go_do_rewarded_interaction(p_member_id uuid, p_dog_id uuid, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance bigint;
  v_old_level integer;
  v_today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_count integer;
  v_response jsonb;
  v_care_awarded integer := 0;
  v_quest_awarded integer := 0;
  v_quest_id uuid;
BEGIN
  IF p_member_id IS NULL OR p_dog_id IS NULL OR p_action IS NULL THEN
    RAISE EXCEPTION 'Invalid MeongGO interaction';
  END IF;

  INSERT INTO public.go_coin_wallets(member_id)
  VALUES (p_member_id)
  ON CONFLICT (member_id) DO NOTHING;

  SELECT balance INTO STRICT v_balance
  FROM public.go_coin_wallets WHERE member_id = p_member_id FOR UPDATE;

  SELECT COALESCE((SELECT level FROM public.go_affinity
    WHERE member_id = p_member_id AND dog_id = p_dog_id), 0)
  INTO v_old_level;

  -- Reuse the original eligibility, per-action cooldown and affection logic.
  -- Any exception rolls back interaction, wallet and reward changes together.
  v_response := public.go_do_interaction(p_member_id, p_dog_id, p_action);
  IF COALESCE((v_response ->> 'ok')::boolean, false) IS NOT TRUE THEN
    RETURN v_response || jsonb_build_object(
      'coinsAdded', 0, 'careCoinsAdded', 0,
      'questCareCoinsAdded', 0, 'coinBalance', v_balance
    );
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.go_coin_transactions
  WHERE member_id = p_member_id AND local_day = v_today
    AND event_type = 'care';

  IF v_count < 5 THEN
    INSERT INTO public.go_coin_transactions(
      member_id, amount, event_type, source_key, local_day
    ) VALUES (
      p_member_id, 10, 'care', 'care:' || gen_random_uuid()::text, v_today
    );
    v_care_awarded := 10;
    v_count := v_count + 1;

    INSERT INTO public.go_coin_transactions(
      member_id, amount, event_type, source_key, local_day
    ) VALUES (
      p_member_id, 10, 'quest_care', 'quest:care:' || v_today::text, v_today
    )
    ON CONFLICT(member_id, source_key) DO NOTHING
    RETURNING id INTO v_quest_id;
    IF v_quest_id IS NOT NULL THEN v_quest_awarded := 10; END IF;
  END IF;

  IF v_care_awarded + v_quest_awarded > 0 THEN
    UPDATE public.go_coin_wallets
    SET balance = balance + v_care_awarded + v_quest_awarded,
        updated_at = now()
    WHERE member_id = p_member_id
    RETURNING balance INTO v_balance;
  END IF;

  RETURN v_response || jsonb_build_object(
    'coinsAdded', v_care_awarded + v_quest_awarded,
    'careCoinsAdded', v_care_awarded,
    'questCareCoinsAdded', v_quest_awarded,
    'coinBalance', v_balance,
    'careRewardsToday', v_count
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.go_do_interaction(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.go_do_rewarded_interaction(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_do_interaction(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.go_do_rewarded_interaction(uuid,uuid,text) TO service_role;
COMMIT;
