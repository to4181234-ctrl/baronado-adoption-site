-- Test-only baseline RPC copied from read-only function metadata on 2026-11-18.
-- No production rows were read and no production SQL was changed.
CREATE OR REPLACE FUNCTION public.go_official_resolve_duplicate(p_member uuid, p_replace boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_today date:=(now() AT TIME ZONE 'Asia/Seoul')::date;
 v_draw public.go_official_daily_draws%ROWTYPE;v_power smallint;v_charm smallint;
BEGIN
 PERFORM 1 FROM public.go_coin_wallets WHERE member_id=p_member FOR UPDATE;
 SELECT * INTO v_draw FROM public.go_official_daily_draws
  WHERE member_id=p_member AND local_day=v_today FOR UPDATE;
 IF NOT FOUND OR NOT v_draw.duplicate THEN
  RETURN jsonb_build_object('ok',false,'error','비교할 중복 카드가 없어요.'); END IF;
 IF v_draw.resolved_at IS NULL THEN
  IF p_replace THEN UPDATE public.go_official_owned
    SET power=v_draw.proposed_power,charm=v_draw.proposed_charm
    WHERE member_id=p_member AND dog_id=v_draw.dog_id AND slot=v_draw.slot; END IF;
  UPDATE public.go_official_daily_draws SET resolved_at=now()
    WHERE member_id=p_member AND local_day=v_today;
 END IF;
 SELECT power,charm INTO v_power,v_charm FROM public.go_official_owned
  WHERE member_id=p_member AND dog_id=v_draw.dog_id AND slot=v_draw.slot;
 RETURN jsonb_build_object('ok',true,'dogId',v_draw.dog_id,'slot',v_draw.slot,
  'power',v_power,'charm',v_charm,'resolved',true);
END;$function$;

REVOKE ALL ON FUNCTION public.go_official_resolve_duplicate(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_official_resolve_duplicate(uuid,boolean) TO service_role;
