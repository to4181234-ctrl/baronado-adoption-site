-- Read-only production function definitions for LOCAL synthetic HTTP QA only.
CREATE OR REPLACE FUNCTION public.go_cancel_visit(p_member_id uuid, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.go_official_new_draft(p_dog uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;v_pub uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.dogs WHERE id=p_dog AND category='adoption') THEN
  RAISE EXCEPTION 'Only registered adoption dogs may have official cards';
 END IF;
 INSERT INTO public.go_official_sets(dog_id) VALUES(p_dog) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.go_official_sets WHERE dog_id=p_dog FOR UPDATE;
 SELECT id INTO v_id FROM public.go_official_versions
  WHERE dog_id=p_dog AND status='draft' LIMIT 1;
 IF v_id IS NOT NULL THEN RETURN v_id; END IF;
 SELECT current_version INTO v_pub FROM public.go_official_sets WHERE dog_id=p_dog;
 INSERT INTO public.go_official_versions(dog_id) VALUES(p_dog) RETURNING id INTO v_id;
 IF v_pub IS NOT NULL THEN
  INSERT INTO public.go_official_assets(version_id,slot,title,original_path,display_path,crop_x,crop_y,zoom)
   SELECT v_id,slot,title,original_path,display_path,crop_x,crop_y,zoom
   FROM public.go_official_assets WHERE version_id=v_pub;
 END IF;
 RETURN v_id;
END;$function$;

CREATE OR REPLACE FUNCTION public.go_request_visit(p_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.go_review_visit(p_request_id uuid, p_decision text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;
