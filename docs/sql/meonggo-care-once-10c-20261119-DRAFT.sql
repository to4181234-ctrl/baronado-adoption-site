-- Release 2026-11-19. One account, one 10C care reward per KST calendar day.
-- Other interactions/affection remain unchanged. No wallet or history migration.
BEGIN;
CREATE OR REPLACE FUNCTION public.go_do_rewarded_interaction(p_member_id uuid, p_dog_id uuid, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance bigint;
  v_today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_care_paid_today bigint := 0;
  v_response jsonb;
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

  -- Locking the wallet before the interaction serializes simultaneous requests.
  -- Count ALL of today's existing quest_care and care grants, including grants
  -- made before this migration. Already credited coins are never clawed back.
  SELECT COALESCE(SUM(amount),0) INTO v_care_paid_today
  FROM public.go_coin_transactions
  WHERE member_id=p_member_id AND local_day=v_today
    AND event_type IN ('care','quest_care');

  IF v_care_paid_today=0 THEN
    INSERT INTO public.go_coin_transactions(
      member_id,amount,event_type,source_key,local_day
    ) VALUES(
      p_member_id,10,'quest_care','quest:care:' || v_today::text,v_today
    ) ON CONFLICT(member_id,source_key) DO NOTHING
    RETURNING id INTO v_quest_id;
    IF v_quest_id IS NOT NULL THEN v_quest_awarded:=10; END IF;
  END IF;

  IF v_quest_awarded > 0 THEN
    UPDATE public.go_coin_wallets
    SET balance = balance + v_quest_awarded,
        updated_at = now()
    WHERE member_id = p_member_id
    RETURNING balance INTO v_balance;
  END IF;

  RETURN v_response || jsonb_build_object(
    'coinsAdded', v_quest_awarded,
    'careCoinsAdded', 0,
    'questCareCoinsAdded', v_quest_awarded,
    'coinBalance', v_balance,
    'careRewardsToday', CASE WHEN v_care_paid_today + v_quest_awarded > 0 THEN 1 ELSE 0 END
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.go_do_rewarded_interaction(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_do_rewarded_interaction(uuid,uuid,text) TO service_role;
COMMIT;
