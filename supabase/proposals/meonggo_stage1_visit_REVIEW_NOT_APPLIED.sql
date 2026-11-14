-- REVIEW ONLY. Stage-one visit verification. Never apply to production
-- before the isolated PostgreSQL tests, backup check and integration review.
BEGIN;

CREATE TABLE IF NOT EXISTS public.go_visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^[0-9]{6}$'),
  status text NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','approved','rejected','cancelled','expired','reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  reviewed_at timestamptz,
  rejected_reason text CHECK (rejected_reason IS NULL OR rejected_reason IN
    ('no_purchase','not_present','unverifiable'))
);
CREATE INDEX IF NOT EXISTS go_visit_requests_member_idx
  ON public.go_visit_requests (member_id,created_at DESC);
CREATE INDEX IF NOT EXISTS go_visit_requests_pending_idx
  ON public.go_visit_requests (created_at DESC) WHERE status='pending';

CREATE TABLE IF NOT EXISTS public.go_visit_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.go_visit_requests(id),
  action text NOT NULL CHECK(action IN
    ('approve','reject','reverse','reverse_denied_insufficient')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS go_visit_admin_audit_request_idx
  ON public.go_visit_admin_audit(request_id,created_at DESC);

ALTER TABLE public.go_visit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.go_visit_admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_visit_requests, public.go_visit_admin_audit
  FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.go_visit_requests TO service_role;
GRANT SELECT,INSERT ON public.go_visit_admin_audit TO service_role;

-- Serializes request creation per member with the same wallet lock as rewards.
CREATE OR REPLACE FUNCTION public.go_request_visit(p_member_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public
AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  v_hour time := (now() AT TIME ZONE 'Asia/Seoul')::time;
  v_request public.go_visit_requests%ROWTYPE;
  v_code text;
  v_id uuid;
  v_attempt integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.go_members
                WHERE id=p_member_id AND NOT disabled) THEN
    RETURN jsonb_build_object('ok',false,'error','로그인이 필요해요.');
  END IF;
  IF v_hour < time '09:00' OR v_hour >= time '21:00' THEN
    RETURN jsonb_build_object('ok',false,'error','방문 인증은 오전 9시부터 오후 9시 이전까지 신청할 수 있어요.');
  END IF;

  INSERT INTO public.go_coin_wallets(member_id) VALUES(p_member_id)
  ON CONFLICT(member_id) DO NOTHING;
  PERFORM 1 FROM public.go_coin_wallets
    WHERE member_id=p_member_id FOR UPDATE;

  -- A reversed approval is not considered completed, so the quest can be retried.
  IF EXISTS(SELECT 1 FROM public.go_visit_requests
    WHERE member_id=p_member_id
      AND status='approved'
      AND (created_at AT TIME ZONE 'Asia/Seoul')::date=v_day) THEN
    RETURN jsonb_build_object('ok',false,'error','오늘의 방문 인증을 이미 완료했어요.');
  END IF;

  UPDATE public.go_visit_requests
  SET status='expired'
  WHERE member_id=p_member_id AND status='pending'
    AND expires_at<=now();

  SELECT * INTO v_request FROM public.go_visit_requests
  WHERE member_id=p_member_id AND status='pending'
    AND expires_at>now()
  ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('ok',true,'id',v_request.id,
    'code',v_request.code,'status',v_request.status,
    'expiresAt',v_request.expires_at,'existing',true); END IF;

  SELECT * INTO v_request FROM public.go_visit_requests
  WHERE member_id=p_member_id AND status='rejected'
  ORDER BY reviewed_at DESC LIMIT 1;
  IF FOUND AND v_request.reviewed_at > now()-interval '1 minute' THEN
    RETURN jsonb_build_object('ok',false,'error','1분 뒤 다시 신청할 수 있어요.',
      'retryAt',v_request.reviewed_at+interval '1 minute');
  END IF;

  FOR v_attempt IN 1..5 LOOP
    v_code := lpad((floor(random()*1000000))::integer::text,6,'0');
    INSERT INTO public.go_visit_requests(member_id,code)
    VALUES(p_member_id,v_code) ON CONFLICT(code) DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok',true,'id',v_id,'code',v_code,
        'status','pending','expiresAt',now()+interval '30 minutes',
        'existing',false);
    END IF;
  END LOOP;
  RAISE EXCEPTION 'Could not allocate unique visit code';
END;
$$;

CREATE OR REPLACE FUNCTION public.go_cancel_visit(
  p_member_id uuid,p_request_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public
AS $$
DECLARE v_request public.go_visit_requests%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.go_coin_wallets
    WHERE member_id=p_member_id FOR UPDATE;
  SELECT * INTO v_request FROM public.go_visit_requests
    WHERE id=p_request_id AND member_id=p_member_id FOR UPDATE;
  IF NOT FOUND OR v_request.status<>'pending' THEN
    RETURN jsonb_build_object('ok',false,'error','취소할 수 없는 인증 요청이에요.');
  END IF;
  IF v_request.expires_at<=now() THEN
    UPDATE public.go_visit_requests SET status='expired' WHERE id=v_request.id;
    RETURN jsonb_build_object('ok',false,'error','이미 만료된 인증이에요.');
  END IF;
  UPDATE public.go_visit_requests SET status='cancelled' WHERE id=v_request.id;
  RETURN jsonb_build_object('ok',true,'status','cancelled');
END;
$$;

-- Called only by an authenticated admin route using service_role.
CREATE OR REPLACE FUNCTION public.go_review_visit(
  p_request_id uuid,p_decision text,p_reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public
AS $$
DECLARE
  v_member uuid;
  v_request public.go_visit_requests%ROWTYPE;
  v_balance bigint;
  v_id uuid;
  v_day date;
BEGIN
  IF p_decision NOT IN ('approve','reject') OR
     (p_decision='reject' AND COALESCE(p_reason,'') NOT IN
       ('no_purchase','not_present','unverifiable')) THEN
    RETURN jsonb_build_object('ok',false,'error','처리 사유를 확인해주세요.');
  END IF;

  SELECT member_id INTO v_member FROM public.go_visit_requests
  WHERE id=p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'error','신청 내역이 없어요.');
  END IF;

  -- Wallet-first lock order is the same for interactions and request creation.
  SELECT balance INTO v_balance FROM public.go_coin_wallets
    WHERE member_id=v_member FOR UPDATE;
  SELECT * INTO v_request FROM public.go_visit_requests
    WHERE id=p_request_id FOR UPDATE;
  IF v_request.status<>'pending' THEN
    RETURN jsonb_build_object('ok',false,'error','이미 처리된 인증이에요.');
  END IF;
  IF v_request.expires_at<=now() THEN
    UPDATE public.go_visit_requests SET status='expired' WHERE id=p_request_id;
    RETURN jsonb_build_object('ok',false,'error','만료된 인증이에요.');
  END IF;

  IF p_decision='reject' THEN
    UPDATE public.go_visit_requests SET status='rejected',
      reviewed_at=now(),rejected_reason=p_reason WHERE id=p_request_id;
    INSERT INTO public.go_visit_admin_audit(request_id,action,detail)
      VALUES(p_request_id,'reject',p_reason);
    RETURN jsonb_build_object('ok',true,'status','rejected');
  END IF;

  v_day := (v_request.created_at AT TIME ZONE 'Asia/Seoul')::date;
  IF EXISTS(SELECT 1 FROM public.go_visit_requests
    WHERE member_id=v_member AND id<>p_request_id AND status='approved'
      AND (created_at AT TIME ZONE 'Asia/Seoul')::date=v_day) THEN
    RETURN jsonb_build_object('ok',false,'error','이미 승인된 방문 퀘스트가 있어요.');
  END IF;

  INSERT INTO public.go_coin_transactions(
    member_id,amount,event_type,source_key,local_day
  ) VALUES(v_member,30,'quest_visit','quest:visit:'||p_request_id,v_day)
  ON CONFLICT(member_id,source_key) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','이미 보상을 지급했어요.');
  END IF;
  UPDATE public.go_coin_wallets
    SET balance=balance+30,updated_at=now()
    WHERE member_id=v_member RETURNING balance INTO v_balance;
  UPDATE public.go_visit_requests SET status='approved',reviewed_at=now(),
    rejected_reason=NULL WHERE id=p_request_id;
  INSERT INTO public.go_visit_admin_audit(request_id,action)
    VALUES(p_request_id,'approve');

  RETURN jsonb_build_object('ok',true,'status','approved',
    'coinsAdded',30,'balance',v_balance);
END;
$$;

-- Mistaken approvals: take back 30C only if balance allows it; otherwise
-- preserve the approval and record the unsuccessful administrative attempt.
CREATE OR REPLACE FUNCTION public.go_reverse_visit(
  p_request_id uuid,p_reason text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public
AS $$
DECLARE
  v_member uuid;
  v_request public.go_visit_requests%ROWTYPE;
  v_balance bigint;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason))<2
     OR length(p_reason)>300 THEN
    RETURN jsonb_build_object('ok',false,'error','회수 사유가 필요해요.');
  END IF;
  SELECT member_id INTO v_member FROM public.go_visit_requests
    WHERE id=p_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'error','인증 내역이 없어요.');
  END IF;
  SELECT balance INTO v_balance FROM public.go_coin_wallets
    WHERE member_id=v_member FOR UPDATE;
  SELECT * INTO v_request FROM public.go_visit_requests
    WHERE id=p_request_id FOR UPDATE;
  IF v_request.status<>'approved' THEN
    RETURN jsonb_build_object('ok',false,'error','승인된 요청만 회수할 수 있어요.');
  END IF;
  IF v_balance<30 THEN
    INSERT INTO public.go_visit_admin_audit(request_id,action,detail)
      VALUES(p_request_id,'reverse_denied_insufficient',trim(p_reason));
    RETURN jsonb_build_object('ok',false,'error',
      '잔액 부족으로 회수하지 않았어요. 관리자 이력에 기록했어요.',
      'balance',v_balance);
  END IF;
  INSERT INTO public.go_coin_transactions(member_id,amount,event_type,source_key,local_day)
    VALUES(v_member,-30,'visit_reversal','visit:reverse:'||p_request_id,
      (now() AT TIME ZONE 'Asia/Seoul')::date);
  UPDATE public.go_coin_wallets
    SET balance=balance-30,updated_at=now()
    WHERE member_id=v_member RETURNING balance INTO v_balance;
  UPDATE public.go_visit_requests SET status='reversed' WHERE id=p_request_id;
  INSERT INTO public.go_visit_admin_audit(request_id,action,detail)
    VALUES(p_request_id,'reverse',trim(p_reason));
  RETURN jsonb_build_object('ok',true,'status','reversed',
    'coinsAdded',-30,'balance',v_balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.go_request_visit(uuid) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.go_cancel_visit(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.go_review_visit(uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.go_reverse_visit(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_request_visit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.go_cancel_visit(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.go_review_visit(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.go_reverse_visit(uuid,text) TO service_role;
COMMIT;
