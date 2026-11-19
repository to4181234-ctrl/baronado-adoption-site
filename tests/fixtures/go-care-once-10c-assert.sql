-- Disposable synthetic DB: full daily cap across all dogs and interactions.
DO $care_qa$
DECLARE
 member uuid:='22222222-2222-4222-8222-222222222222';
 d1 uuid:='33333333-3333-4333-8333-333333333333';
 d2 uuid:='44444444-4444-4444-8444-444444444444';
 r jsonb;before_balance bigint;today date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
BEGIN
 SELECT balance INTO before_balance FROM public.go_coin_wallets WHERE member_id=member;
 IF EXISTS(SELECT 1 FROM public.go_coin_transactions WHERE member_id=member AND local_day=today AND event_type IN ('care','quest_care')) THEN
  RAISE EXCEPTION 'Test member already has a care reward today'; END IF;
 r:=public.go_do_rewarded_interaction(member,d1,'snack');
 IF r->>'ok'<>'true' OR (r->>'coinsAdded')::int<>10 OR (r->>'careRewardsToday')::int<>1
  THEN RAISE EXCEPTION 'First daily action was not 10C %',r; END IF;
 r:=public.go_do_rewarded_interaction(member,d1,'praise');
 IF r->>'ok'<>'true' OR (r->>'coinsAdded')::int<>0
  THEN RAISE EXCEPTION 'Second same-dog action paid extra coins %',r; END IF;
 r:=public.go_do_rewarded_interaction(member,d2,'play');
 IF r->>'ok'<>'true' OR (r->>'coinsAdded')::int<>0
  THEN RAISE EXCEPTION 'Cross-dog action paid extra coins %',r; END IF;
 IF (SELECT balance FROM public.go_coin_wallets WHERE member_id=member)<>before_balance+10
 OR (SELECT count(*) FROM public.go_coin_transactions WHERE member_id=member AND local_day=today AND event_type IN ('care','quest_care'))<>1
 OR (SELECT COALESCE(sum(amount),0) FROM public.go_coin_transactions WHERE member_id=member AND local_day=today AND event_type IN ('care','quest_care'))<>10
 OR (SELECT count(*) FROM public.go_interactions WHERE member_id=member AND created_at>=today::timestamp AT TIME ZONE 'Asia/Seoul')<3 THEN
  RAISE EXCEPTION 'Daily wallet cap, receipt count, or interaction history mismatch'; END IF;
 -- Member A's old multi-reward history remains intact; never claw back.
 IF (SELECT count(*) FROM public.go_coin_transactions WHERE member_id='11111111-1111-4111-8111-111111111111'::uuid AND event_type IN ('care','quest_care'))<2 THEN
  RAISE EXCEPTION 'Prior reward ledger modified'; END IF;
END $care_qa$;
