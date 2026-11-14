-- Isolated PostgreSQL CI assertions: run with ON_ERROR_STOP=1 after
-- fixture, original affinity SQL, coin proposal and visit proposal.
DO $$
DECLARE
  m uuid := '11111111-1111-4111-8111-111111111111';
  d1 uuid := '22222222-2222-4222-8222-222222222222';
  d2 uuid := '33333333-3333-4333-8333-333333333333';
  r jsonb;
  n integer;
  v_id uuid;
  v2_id uuid;
BEGIN
  SELECT public.go_do_rewarded_interaction(m,d1,'snack') INTO r;
  IF (r->>'coinsAdded')::integer<>20 OR (r->>'questCareCoinsAdded')::integer<>10
    THEN RAISE EXCEPTION 'First care should award 10+10, got %',r; END IF;

  SELECT public.go_do_rewarded_interaction(m,d1,'snack') INTO r;
  IF (r->>'ok')::boolean IS DISTINCT FROM false
     OR (r->>'coinsAdded')::integer<>0
    THEN RAISE EXCEPTION 'Immediate repeat should be denied, got %',r; END IF;

  SELECT public.go_do_rewarded_interaction(m,d1,'praise') INTO r;
  IF (r->>'coinsAdded')::integer<>10 THEN RAISE EXCEPTION 'second care %',r; END IF;
  SELECT public.go_do_rewarded_interaction(m,d1,'play') INTO r;
  IF (r->>'coinsAdded')::integer<>10 THEN RAISE EXCEPTION 'third care %',r; END IF;
  SELECT public.go_do_rewarded_interaction(m,d2,'snack') INTO r;
  IF (r->>'coinsAdded')::integer<>10 THEN RAISE EXCEPTION 'fourth care %',r; END IF;
  SELECT public.go_do_rewarded_interaction(m,d2,'praise') INTO r;
  IF (r->>'coinsAdded')::integer<>10 THEN RAISE EXCEPTION 'fifth care %',r; END IF;

  SELECT public.go_do_rewarded_interaction(m,d2,'play') INTO r;
  IF (r->>'coinsAdded')::integer<>0 OR (r->>'careRewardsToday')::integer<>5
    THEN RAISE EXCEPTION 'sixth care should not award coins, got %',r; END IF;

  SELECT balance INTO n FROM public.go_coin_wallets WHERE member_id=m;
  IF n<>60 THEN RAISE EXCEPTION 'wallet expected 60, got %',n; END IF;
  SELECT count(*) INTO n FROM public.go_coin_transactions WHERE member_id=m;
  IF n<>6 THEN RAISE EXCEPTION 'expected 5 cares + 1 quest, got %',n; END IF;

  INSERT INTO public.go_visit_requests(member_id,code) VALUES(m,'123456')
  RETURNING id INTO v_id;
  SELECT public.go_review_visit(v_id,'approve',null) INTO r;
  IF (r->>'coinsAdded')::integer<>30 OR (r->>'balance')::integer<>90
    THEN RAISE EXCEPTION 'approval failed: %',r; END IF;
  SELECT public.go_review_visit(v_id,'approve',null) INTO r;
  IF (r->>'ok')::boolean IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'duplicate approval was not blocked: %',r; END IF;
  SELECT public.go_reverse_visit(v_id,'실수로 승인') INTO r;
  IF (r->>'coinsAdded')::integer<>-30
    THEN RAISE EXCEPTION 'valid reversal failed: %',r; END IF;
  SELECT balance INTO n FROM public.go_coin_wallets WHERE member_id=m;
  IF n<>60 THEN RAISE EXCEPTION 'post reversal wallet expected 60, got %',n; END IF;

  INSERT INTO public.go_visit_requests(member_id,code) VALUES(m,'234567')
  RETURNING id INTO v2_id;
  SELECT public.go_review_visit(v2_id,'approve',null) INTO r;
  IF (r->>'coinsAdded')::integer<>30
    THEN RAISE EXCEPTION 're-earned visit failed: %',r; END IF;
  UPDATE public.go_coin_wallets SET balance=0 WHERE member_id=m;
  SELECT public.go_reverse_visit(v2_id,'잔액 부족 회수 확인') INTO r;
  IF (r->>'ok')::boolean IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'insufficient balance should keep approval: %',r; END IF;
  SELECT count(*) INTO n FROM public.go_visit_admin_audit
    WHERE request_id=v2_id AND action='reverse_denied_insufficient';
  IF n<>1 THEN RAISE EXCEPTION 'missing denied reversal audit'; END IF;
  SELECT count(*) INTO n FROM public.go_visit_requests
    WHERE id=v2_id AND status='approved';
  IF n<>1 THEN RAISE EXCEPTION 'should not erase approved visit when balance < 30'; END IF;

  IF has_table_privilege('authenticated','public.go_coin_transactions','SELECT')
    THEN RAISE EXCEPTION 'coin ledger is exposed to authenticated client'; END IF;
  IF has_function_privilege('authenticated','public.go_review_visit(uuid,text,text)','EXECUTE')
    THEN RAISE EXCEPTION 'admin review function is exposed'; END IF;
  RAISE NOTICE 'STAGE ONE DB ASSERTIONS PASSED';
END
$$;
