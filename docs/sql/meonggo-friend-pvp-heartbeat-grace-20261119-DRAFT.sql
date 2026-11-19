-- TEST IN DISPOSABLE LOCAL DB FIRST. Install only after explicit release approval.
-- Restore normal mobile network jitter tolerance: 15s heartbeat grace for READY reset
-- and connected indicator; retain 30s hard cancellation and 2m ready timeout.
-- Built from existing stage5 source without changing card ownership/reward rules.
BEGIN;
CREATE OR REPLACE FUNCTION public.go_pvp_action(p_member uuid, p_room uuid, p_action text, p_kind text DEFAULT NULL::text, p_card uuid DEFAULT NULL::uuid, p_slot smallint DEFAULT NULL::smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_room public.go_pvp_rooms%ROWTYPE;v_round public.go_pvp_rounds%ROWTYPE;
 v_host boolean;v_card jsonb;v_score_h integer;v_score_g integer;v_winner text;
 v_day date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
 v_player uuid;v_new_reward uuid;v_coin_added integer:=0;
 v_host_name text;v_guest_name text;
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
    -- All coins are serialized by account, with unique member/day source key.
    FOR v_player IN SELECT unnest(ARRAY[v_room.host_id,v_room.guest_id]) ORDER BY 1 LOOP
     INSERT INTO public.go_coin_wallets(member_id) VALUES(v_player) ON CONFLICT DO NOTHING;
     PERFORM 1 FROM public.go_coin_wallets WHERE member_id=v_player FOR UPDATE;
     v_new_reward:=NULL;
     INSERT INTO public.go_coin_transactions(member_id,amount,event_type,source_key,local_day)
      VALUES(v_player,10,'quest_battle','quest:battle:'||v_day::text,v_day)
      ON CONFLICT(member_id,source_key) DO NOTHING RETURNING id INTO v_new_reward;
     IF v_new_reward IS NOT NULL THEN
      UPDATE public.go_coin_wallets SET balance=balance+10,updated_at=now()
       WHERE member_id=v_player;
      IF v_player=p_member THEN v_coin_added:=10; END IF;
     END IF;
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

CREATE OR REPLACE FUNCTION public.go_pvp_snapshot(p_member uuid, p_room uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_room public.go_pvp_rooms%ROWTYPE;v_round public.go_pvp_rounds%ROWTYPE;
 v_role text;v_self jsonb;v_other jsonb;v_own_stats jsonb;v_their_stats jsonb;v_history jsonb;
 v_host_name text;v_guest_name text;v_other_id uuid;
BEGIN
 SELECT * INTO v_room FROM public.go_pvp_rooms WHERE id=p_room;
 IF NOT FOUND OR (p_member IS DISTINCT FROM v_room.host_id AND p_member IS DISTINCT FROM v_room.guest_id) THEN
  RETURN jsonb_build_object('ok',false,'error','참가한 방만 확인할 수 있어요.');
 END IF;
 v_role:=CASE WHEN p_member=v_room.host_id THEN 'host' ELSE 'guest' END;
 v_other_id:=CASE WHEN v_role='host' THEN v_room.guest_id ELSE v_room.host_id END;
 SELECT * INTO v_round FROM public.go_pvp_rounds
  WHERE room_id=p_room AND round_number=v_room.round_number;
 SELECT nickname INTO v_host_name FROM public.go_members WHERE id=v_room.host_id;
 SELECT nickname INTO v_guest_name FROM public.go_members WHERE id=v_room.guest_id;
 v_self:=CASE WHEN v_role='host' THEN v_round.host_card ELSE v_round.guest_card END;
 -- Keep the adversary's image, ID, stats and title secret before joint reveal.
 v_other:=CASE WHEN v_room.status='completed' THEN
  CASE WHEN v_role='host' THEN v_round.guest_card ELSE v_round.host_card END
  ELSE NULL END;
 SELECT jsonb_build_object(
  'wins',count(*) FILTER(WHERE outcome='win'),
  'draws',count(*) FILTER(WHERE outcome='draw'),
  'losses',count(*) FILTER(WHERE outcome='loss')
 ) INTO v_own_stats FROM public.go_pvp_records WHERE member_id=p_member;
 SELECT jsonb_build_object(
  'wins',count(*) FILTER(WHERE outcome='win'),
  'draws',count(*) FILTER(WHERE outcome='draw'),
  'losses',count(*) FILTER(WHERE outcome='loss')
 ) INTO v_their_stats FROM public.go_pvp_records WHERE member_id=v_other_id;
 SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_history
 FROM (
  SELECT opponent_name AS "opponentName",outcome,finished_at AS "finishedAt",
    my_score AS "myScore",opponent_score AS "opponentScore"
  FROM public.go_pvp_records WHERE member_id=p_member
  ORDER BY finished_at DESC,id DESC LIMIT 20
 ) t;
 RETURN jsonb_build_object('ok',true,'roomId',v_room.id,
  'inviteCode',CASE WHEN v_room.status='waiting' THEN v_room.invite_code ELSE NULL END,
  'status',v_room.status,'round',v_room.round_number,'role',v_role,
  'hostName',COALESCE(v_host_name,'멍기록가'),'guestName',COALESCE(v_guest_name,'참가 대기'),
  'joined',v_room.guest_id IS NOT NULL,
  'inviteExpiresAt',v_room.invite_expires_at,'readyDeadline',v_room.ready_deadline,
  'otherConnected',CASE WHEN v_room.status='playing' THEN
    (CASE WHEN v_role='host' THEN v_room.guest_seen_at ELSE v_room.host_seen_at END)
     >=now()-interval '15 seconds'
    ELSE true END,
  'reconnectDeadline',CASE WHEN v_room.status='playing' THEN
    (CASE WHEN v_role='host' THEN v_room.guest_seen_at ELSE v_room.host_seen_at END)
      +interval '30 seconds' ELSE NULL END,
  'myReady',CASE WHEN v_role='host' THEN v_round.host_ready ELSE v_round.guest_ready END,
  'otherReady',CASE WHEN v_role='host' THEN v_round.guest_ready ELSE v_round.host_ready END,
  'mySelected',v_self IS NOT NULL,
  'otherSelected',CASE WHEN v_role='host' THEN v_round.guest_card IS NOT NULL ELSE v_round.host_card IS NOT NULL END,
  'myCard',v_self,'otherCard',v_other,
  'myRematch',CASE WHEN v_role='host' THEN v_room.host_rematch ELSE v_room.guest_rematch END,
  'otherRematch',CASE WHEN v_role='host' THEN v_room.guest_rematch ELSE v_room.host_rematch END,
  'winner',v_round.winner,'hostScore',v_round.host_score,'guestScore',v_round.guest_score,
  'myStats',v_own_stats,'otherStats',v_their_stats,'recent',v_history);
END;$function$;
COMMIT;
