-- DRAFT: approved care quest visits any non-max-affinity adoption dog.
-- Eligibility does not depend on owning a card. Member, cooldown, daily and affinity limits are preserved.
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

REVOKE ALL ON FUNCTION public.go_do_interaction(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_do_interaction(uuid,uuid,text) TO service_role;
COMMIT;
