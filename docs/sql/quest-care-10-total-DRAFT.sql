-- DRAFT ONLY. Newer user decision: "멍멍이 만나러가기" gives 10C TOTAL
-- upon the first successful daily care interaction (not 20C/30C).
-- Do NOT apply to production without isolated DB test + user approval.
-- Requires stage3-care-and-official-eligibility and its preceding migrations.
-- Existing wallet balances and prior transaction rows are preserved.
BEGIN;
CREATE OR REPLACE FUNCTION public.go_do_rewarded_interaction(p_member_id uuid, p_dog_id uuid, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance bigint;
  v_today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_count integer;
  v_quest_already_done boolean;
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

  -- Reuse the original eligibility, per-action cooldown and affection logic.
  -- Any exception rolls back interaction, wallet and reward changes together.
  v_response := public.go_do_interaction(p_member_id, p_dog_id, p_action);
  IF COALESCE((v_response ->> 'ok')::boolean, false) IS NOT TRUE THEN
    RETURN v_response || jsonb_build_object(
      'coinsAdded', 0, 'careCoinsAdded', 0,
      'questCareCoinsAdded', 0, 'coinBalance', v_balance
    );
  END IF;

  -- The accepted daily quest grants a TOTAL of 10C on its first successful
  -- interaction; it must NOT stack another 10C care reward at that moment.
  -- Count successful care actions including the one just written by
  -- go_do_interaction, not reward-ledger entries (older data may contain both
  -- a care and a quest_care receipt for a single action).
  SELECT count(*)::integer INTO v_count
  FROM public.go_interactions
  WHERE member_id = p_member_id
    AND created_at >= (v_today::timestamp AT TIME ZONE 'Asia/Seoul')
    AND created_at < ((v_today + 1)::timestamp AT TIME ZONE 'Asia/Seoul');

  IF v_count <= 5 THEN
    SELECT EXISTS(
      SELECT 1 FROM public.go_coin_transactions
      WHERE member_id = p_member_id AND local_day = v_today
        AND event_type = 'quest_care'
    ) INTO v_quest_already_done;

    IF NOT v_quest_already_done THEN
      INSERT INTO public.go_coin_transactions(
        member_id, amount, event_type, source_key, local_day
      ) VALUES (
        p_member_id, 10, 'quest_care', 'quest:care:' || v_today::text, v_today
      ) ON CONFLICT(member_id, source_key) DO NOTHING
      RETURNING id INTO v_quest_id;
      IF v_quest_id IS NOT NULL THEN v_quest_awarded := 10; END IF;
    END IF;

    -- Later interactions still award the usual 10C, up to five rewarded
    -- interactions per calendar day in total (first quest included).
    IF v_quest_awarded = 0 THEN
      INSERT INTO public.go_coin_transactions(
        member_id, amount, event_type, source_key, local_day
      ) VALUES (
        p_member_id, 10, 'care', 'care:' || gen_random_uuid()::text, v_today
      );
      v_care_awarded := 10;
    END IF;
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
REVOKE ALL ON FUNCTION public.go_do_rewarded_interaction(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_do_rewarded_interaction(uuid,uuid,text) TO service_role;
COMMIT;
