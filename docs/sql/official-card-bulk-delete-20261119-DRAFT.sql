-- Draft for staging/isolated DB first. Never apply to production without validated replay.
CREATE OR REPLACE FUNCTION public.go_official_bulk_delete(p_member uuid,p_dog uuid,p_slots integer[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $body$
DECLARE normalized integer[]; existing_count integer; deleted_count integer; hidden_count integer;
BEGIN
 IF p_member IS NULL OR p_dog IS NULL OR p_slots IS NULL OR cardinality(p_slots) < 1 OR cardinality(p_slots)>5
 THEN RETURN jsonb_build_object('ok',false,'error','카드를 선택해주세요.'); END IF;
 SELECT array_agg(DISTINCT s ORDER BY s) INTO normalized FROM unnest(p_slots) AS s;
 IF cardinality(normalized)<>cardinality(p_slots) OR EXISTS(SELECT 1 FROM unnest(normalized) AS s WHERE s NOT BETWEEN 1 AND 5)
 THEN RETURN jsonb_build_object('ok',false,'error','선택 항목이 올바르지 않아요.'); END IF;
 PERFORM 1 FROM public.go_members WHERE id=p_member FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','멍기록가 정보를 찾지 못했어요.'); END IF;
 SELECT count(*) INTO existing_count FROM public.go_official_owned WHERE member_id=p_member AND dog_id=p_dog AND slot=ANY(normalized);
 SELECT count(*) INTO hidden_count FROM public.go_official_hidden WHERE member_id=p_member AND dog_id=p_dog AND 5=ANY(normalized);
 IF existing_count+hidden_count<>cardinality(normalized)
 THEN RETURN jsonb_build_object('ok',false,'error','소유한 공식 멍카드만 삭제할 수 있어요.'); END IF;
 DELETE FROM public.go_official_owned WHERE member_id=p_member AND dog_id=p_dog AND slot=ANY(normalized);
 GET DIAGNOSTICS deleted_count=ROW_COUNT;
 IF 5=ANY(normalized) THEN
   DELETE FROM public.go_official_hidden WHERE member_id=p_member AND dog_id=p_dog;
   GET DIAGNOSTICS hidden_count=ROW_COUNT;
   deleted_count:=deleted_count+hidden_count;
 END IF;
 IF deleted_count<>cardinality(normalized) THEN RAISE EXCEPTION 'ownership changed during delete'; END IF;
 RETURN jsonb_build_object('ok',true,'deletedSlots',to_jsonb(normalized));
END $body$;
REVOKE ALL ON FUNCTION public.go_official_bulk_delete(uuid,uuid,integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.go_official_bulk_delete(uuid,uuid,integer[]) TO service_role;
