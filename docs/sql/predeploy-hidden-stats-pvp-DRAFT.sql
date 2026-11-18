-- REVIEW DRAFT ONLY; never run against the production Supabase database.
-- Depends on stage2-four-plus-one-DRAFT.sql and stage5-friend-pvp-and-random-battle-DRAFT.sql.
-- Existing acquired HIDDEN cards get their previously missing ratings exactly once.
-- Existing power/charm values are never rerolled. Test with isolated DB and backups.
BEGIN;
ALTER TABLE public.go_official_hidden ADD COLUMN IF NOT EXISTS power smallint;
ALTER TABLE public.go_official_hidden ADD COLUMN IF NOT EXISTS charm smallint;
ALTER TABLE public.go_official_hidden DROP CONSTRAINT IF EXISTS go_official_hidden_power_range;
ALTER TABLE public.go_official_hidden DROP CONSTRAINT IF EXISTS go_official_hidden_charm_range;
ALTER TABLE public.go_official_hidden ADD CONSTRAINT go_official_hidden_power_range CHECK(power BETWEEN 1 AND 5);
ALTER TABLE public.go_official_hidden ADD CONSTRAINT go_official_hidden_charm_range CHECK(charm BETWEEN 1 AND 5);
UPDATE public.go_official_hidden SET power=public.go_battle_random_rating() WHERE power IS NULL;
UPDATE public.go_official_hidden SET charm=public.go_battle_random_rating() WHERE charm IS NULL;
ALTER TABLE public.go_official_hidden ALTER COLUMN power SET NOT NULL;
ALTER TABLE public.go_official_hidden ALTER COLUMN charm SET NOT NULL;

CREATE OR REPLACE FUNCTION public.go_official_unlock_hidden(p_member uuid,p_dog uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path TO 'public' AS $f$
DECLARE v_count integer;v_inserted integer;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.go_members WHERE id=p_member AND NOT disabled) THEN
  RETURN jsonb_build_object('ok',false,'error','로그인이 필요해요.');
 END IF;
 PERFORM 1 FROM public.go_official_sets WHERE dog_id=p_dog
  AND current_version IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','공식 멍카드가 준비되지 않았어요.'); END IF;
 SELECT count(DISTINCT slot) INTO v_count FROM public.go_official_owned
  WHERE member_id=p_member AND dog_id=p_dog AND slot BETWEEN 1 AND 4;
 IF v_count<>4 THEN RETURN jsonb_build_object('ok',false,'error','일반 멍카드 4종을 먼저 모아주세요.'); END IF;
 INSERT INTO public.go_official_hidden(member_id,dog_id,power,charm)
 VALUES(p_member,p_dog,public.go_battle_random_rating(),public.go_battle_random_rating())
 ON CONFLICT(member_id,dog_id) DO NOTHING;
 GET DIAGNOSTICS v_inserted=ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'unlocked',true,'new',v_inserted=1);
END;$f$;
REVOKE ALL ON FUNCTION public.go_official_unlock_hidden(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_official_unlock_hidden(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.go_pvp_has_card(p_member uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $f$
 SELECT EXISTS(SELECT 1 FROM public.go_cards c JOIN public.go_battle_card_stats s ON s.card_id=c.id
  WHERE c.member_id=p_member AND c.status='approved')
 OR EXISTS(SELECT 1 FROM public.go_official_owned WHERE member_id=p_member)
 OR EXISTS(SELECT 1 FROM public.go_official_hidden WHERE member_id=p_member);
$f$;

CREATE OR REPLACE FUNCTION public.go_pvp_card_snapshot(p_member uuid,p_kind text,p_card uuid,p_slot smallint)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $f$
DECLARE v_data jsonb;
BEGIN
 IF p_kind='camera' AND p_card IS NOT NULL AND p_slot IS NULL THEN
  SELECT jsonb_build_object('kind','camera','cardId',c.id,'dogId',c.dog_id,'dogName',d.name,
   'title',c.title,'power',s.power,'charm',s.charm,'imagePath',c.image_path) INTO v_data
  FROM public.go_cards c JOIN public.go_battle_card_stats s ON s.card_id=c.id
   JOIN public.dogs d ON d.id=c.dog_id
  WHERE c.id=p_card AND c.member_id=p_member AND c.status='approved';
 ELSIF p_kind='official' AND p_card IS NOT NULL AND p_slot BETWEEN 1 AND 4 THEN
  SELECT jsonb_build_object('kind','official','cardId',o.dog_id,'slot',o.slot,
   'dogId',o.dog_id,'dogName',d.name,'title',a.title,
   'power',o.power,'charm',o.charm,'imagePath',a.display_path) INTO v_data
  FROM public.go_official_owned o JOIN public.dogs d ON d.id=o.dog_id
  JOIN public.go_official_sets os ON os.dog_id=o.dog_id
  JOIN public.go_official_assets a ON a.version_id=os.current_version AND a.slot=o.slot
  WHERE o.member_id=p_member AND o.dog_id=p_card AND o.slot=p_slot;
 ELSIF p_kind='official' AND p_card IS NOT NULL AND p_slot=5 THEN
  SELECT jsonb_build_object('kind','official','cardId',h.dog_id,'slot',5,
   'dogId',h.dog_id,'dogName',d.name,'title',a.title,
   'power',h.power,'charm',h.charm,'imagePath',a.display_path) INTO v_data
  FROM public.go_official_hidden h JOIN public.dogs d ON d.id=h.dog_id
  JOIN public.go_official_sets os ON os.dog_id=h.dog_id
  JOIN public.go_official_assets a ON a.version_id=os.current_version AND a.slot=5
  WHERE h.member_id=p_member AND h.dog_id=p_card;
 END IF;
 RETURN v_data;
END;$f$;
COMMIT;
