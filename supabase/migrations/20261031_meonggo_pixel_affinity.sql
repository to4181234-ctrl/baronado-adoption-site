-- Figma v3 pixel interaction: per-button 2/day, 30-min cooldown,
-- friendship +3/day and 10 total. Atomic under one locked member/dog row.
CREATE TABLE IF NOT EXISTS public.go_affinity (
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
 level smallint NOT NULL DEFAULT 0 CHECK(level BETWEEN 0 AND 10),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(member_id,dog_id)
);
ALTER TABLE public.go_affinity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_affinity FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS public.go_interactions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
 action text NOT NULL CHECK(action IN ('snack','praise','play')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS go_interactions_limits_idx ON public.go_interactions(member_id,dog_id,action,created_at DESC);
ALTER TABLE public.go_interactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_interactions FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.go_do_interaction(p_member_id uuid,p_dog_id uuid,p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
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
 IF NOT EXISTS(SELECT 1 FROM public.go_cards WHERE member_id=p_member_id AND dog_id=p_dog_id AND status='approved') THEN
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
$$;
REVOKE EXECUTE ON FUNCTION public.go_do_interaction(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_do_interaction(uuid,uuid,text) TO service_role;
