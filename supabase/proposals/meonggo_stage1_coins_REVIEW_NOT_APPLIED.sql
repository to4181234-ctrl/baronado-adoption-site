-- REVIEW ONLY: stage-one MeongGO coin ledger and atomic care rewards.
-- Do not execute on production. Convert to a dated migration using Supabase CLI
-- after testing against a separate database and validating backup/rollback.
-- The public API is guarded by MEONGGO_STAGE1_COINS_ENABLED.
BEGIN;

CREATE TABLE IF NOT EXISTS public.go_coin_wallets (
  member_id uuid PRIMARY KEY REFERENCES public.go_members(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.go_coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount <> 0),
  event_type text NOT NULL CHECK (event_type IN (
    'care','quest_care','quest_visit','visit_reversal','store_purchase'
  )),
  source_key text NOT NULL CHECK (length(source_key) BETWEEN 1 AND 200),
  local_day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, source_key)
);
CREATE INDEX IF NOT EXISTS go_coin_transactions_history_idx
  ON public.go_coin_transactions(member_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS go_coin_transactions_daily_idx
  ON public.go_coin_transactions(member_id, local_day, event_type);

ALTER TABLE public.go_coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.go_coin_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_coin_wallets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.go_coin_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.go_coin_wallets TO service_role;
GRANT SELECT, INSERT ON public.go_coin_transactions TO service_role;

-- Serialize ALL reward attempts for one account before running existing
-- interaction logic. Cross-dog concurrent calls cannot bypass the daily cap.
-- Only service_role may call this function; the API checks signed goMember.
CREATE OR REPLACE FUNCTION public.go_do_rewarded_interaction(
  p_member_id uuid,
  p_dog_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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

  IF v_old_level < 10 AND v_count < 5 THEN
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
$$;

REVOKE EXECUTE ON FUNCTION public.go_do_rewarded_interaction(uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.go_do_rewarded_interaction(uuid,uuid,text)
  TO service_role;

COMMIT;
