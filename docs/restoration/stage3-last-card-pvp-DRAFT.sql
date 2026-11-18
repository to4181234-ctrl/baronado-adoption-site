-- STAGING-ONLY REVIEW DRAFT. DO NOT APPLY TO PRODUCTION WITHOUT INTEGRATION QA.
-- On deleting a member's last owned card for a dog, clear that member's dog-specific
-- random and friend PvP records. Preserve the opponent's independently owned records.
-- The original go_pvp_records schema did not identify the participating dog.
BEGIN;

ALTER TABLE public.go_pvp_records ADD COLUMN IF NOT EXISTS dog_id uuid;
CREATE INDEX IF NOT EXISTS go_pvp_records_member_dog
  ON public.go_pvp_records(member_id,dog_id);

-- Existing records can only be assigned where the historic round snapshot is valid.
UPDATE public.go_pvp_records pr
SET dog_id = CASE WHEN pr.member_id=r.host_id
                 THEN (rd.host_card->>'dogId')::uuid
                 ELSE (rd.guest_card->>'dogId')::uuid END
FROM public.go_pvp_rooms r
JOIN public.go_pvp_rounds rd ON rd.room_id=r.id
WHERE pr.room_id=r.id AND pr.round_number=rd.round_number
  AND pr.dog_id IS NULL
  AND (pr.member_id=r.host_id OR pr.member_id=r.guest_id)
  AND EXISTS(SELECT 1 FROM public.dogs d WHERE d.id::text=lower(CASE WHEN pr.member_id=r.host_id THEN rd.host_card->>'dogId' ELSE rd.guest_card->>'dogId' END))
  AND (CASE WHEN pr.member_id=r.host_id
            THEN rd.host_card->>'dogId' ELSE rd.guest_card->>'dogId' END)
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- Automatically store the participating dog for every NEW PvP result. This avoids
-- replacing the existing (complex) go_pvp_action RPC and all its security guards.
CREATE OR REPLACE FUNCTION public.go_stage3_set_pvp_dog_id()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_candidate text; v_players uuid[]; v_player uuid;
BEGIN
  SELECT CASE WHEN NEW.member_id=room.host_id THEN rd.host_card->>'dogId'
              WHEN NEW.member_id=room.guest_id THEN rd.guest_card->>'dogId'
              ELSE NULL END,ARRAY[room.host_id,room.guest_id] INTO v_candidate,v_players
  FROM public.go_pvp_rooms room
  JOIN public.go_pvp_rounds rd ON rd.room_id=room.id
  WHERE room.id=NEW.room_id AND rd.round_number=NEW.round_number;
  FOR v_player IN SELECT unnest(v_players) ORDER BY 1 LOOP
    PERFORM 1 FROM public.go_members WHERE id=v_player FOR UPDATE;
  END LOOP;
  NEW.dog_id:=NULL;
  IF v_candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    NEW.dog_id:=v_candidate::uuid;
    IF NOT public.go_stage3_has_any_card(NEW.member_id,NEW.dog_id) THEN RETURN NULL; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS go_stage3_pvp_dog_record ON public.go_pvp_records;
CREATE TRIGGER go_stage3_pvp_dog_record BEFORE INSERT ON public.go_pvp_records
FOR EACH ROW EXECUTE FUNCTION public.go_stage3_set_pvp_dog_id();

-- Exact per-member/dog random-battle records. A match row is an immutable receipt,
-- not two records belonging to the initiating player. Backfill only provable owners.
CREATE TABLE IF NOT EXISTS public.go_random_dog_records(
 battle_id uuid NOT NULL REFERENCES public.go_battles(id) ON DELETE CASCADE,
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
 outcome text NOT NULL CHECK(outcome IN ('win','draw','loss')),
 created_at timestamptz NOT NULL,
 PRIMARY KEY(battle_id,member_id,dog_id)
);
CREATE INDEX IF NOT EXISTS go_random_dog_records_member_dog ON public.go_random_dog_records(member_id,dog_id);
CREATE TABLE IF NOT EXISTS public.go_dog_record_resets(
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
 reset_at timestamptz NOT NULL,PRIMARY KEY(member_id,dog_id)
);
ALTER TABLE public.go_random_dog_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.go_dog_record_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_random_dog_records,public.go_dog_record_resets FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.go_random_dog_records,public.go_dog_record_resets TO service_role;

CREATE OR REPLACE FUNCTION public.go_stage3_has_any_card(p_member uuid,p_dog uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.go_cards WHERE member_id=p_member AND dog_id=p_dog)
 OR EXISTS(SELECT 1 FROM public.go_official_owned WHERE member_id=p_member AND dog_id=p_dog)
 OR EXISTS(SELECT 1 FROM public.go_official_hidden WHERE member_id=p_member AND dog_id=p_dog)
$$;

-- Suppress provably orphaned historic dog records without destroying snapshots.
-- A subsequent acquisition must not revive records from before this reset.
INSERT INTO public.go_dog_record_resets(member_id,dog_id,reset_at)
 SELECT DISTINCT member_id,dog_id,clock_timestamp() FROM public.go_pvp_records pr
 WHERE dog_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.dogs d WHERE d.id=pr.dog_id) AND NOT public.go_stage3_has_any_card(pr.member_id,pr.dog_id)
 ON CONFLICT(member_id,dog_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.go_stage3_record_random()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.go_members WHERE id=NEW.member_id FOR UPDATE;
 INSERT INTO public.go_random_dog_records(battle_id,member_id,dog_id,outcome,created_at)
 SELECT NEW.id,NEW.member_id,c.dog_id,
 CASE WHEN NEW.winner='draw' THEN 'draw' WHEN NEW.winner=side.label THEN 'win' ELSE 'loss' END,NEW.created_at
 FROM (VALUES('first',NEW.first_card_id,NEW.first_dog_id),('second',NEW.second_card_id,NEW.second_dog_id)) side(label,card_id,dog_id)
 JOIN public.go_cards c ON c.id=side.card_id AND c.member_id=NEW.member_id AND c.dog_id=side.dog_id
 WHERE NOT EXISTS(SELECT 1 FROM public.go_dog_record_resets r WHERE r.member_id=NEW.member_id AND r.dog_id=c.dog_id AND r.reset_at>=NEW.created_at)
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS go_stage3_random_record ON public.go_battles;
CREATE TRIGGER go_stage3_random_record AFTER INSERT ON public.go_battles
FOR EACH ROW EXECUTE FUNCTION public.go_stage3_record_random();

INSERT INTO public.go_random_dog_records(battle_id,member_id,dog_id,outcome,created_at)
 SELECT b.id,b.member_id,c.dog_id,
 CASE WHEN b.winner='draw' THEN 'draw' WHEN b.winner=side.label THEN 'win' ELSE 'loss' END,b.created_at
 FROM public.go_battles b
 CROSS JOIN LATERAL(VALUES('first',b.first_card_id,b.first_dog_id),('second',b.second_card_id,b.second_dog_id)) side(label,card_id,dog_id)
 JOIN public.go_cards c ON c.id=side.card_id AND c.member_id=b.member_id AND c.dog_id=side.dog_id
 WHERE NOT EXISTS(SELECT 1 FROM public.go_dog_record_resets r WHERE r.member_id=b.member_id AND r.dog_id=c.dog_id AND r.reset_at>=b.created_at)
 ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.go_battle_cleanup_last_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE deleted_dog text;
BEGIN
 PERFORM 1 FROM public.go_members WHERE id=OLD.member_id FOR UPDATE;
 IF NOT EXISTS (SELECT 1 FROM public.go_cards WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id)
 AND NOT EXISTS (SELECT 1 FROM public.go_official_owned WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id)
 AND NOT EXISTS (SELECT 1 FROM public.go_official_hidden WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id)
 THEN
  DELETE FROM public.go_random_dog_records WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id;
  DELETE FROM public.go_pvp_records WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id;
  INSERT INTO public.go_dog_record_resets(member_id,dog_id,reset_at) VALUES(OLD.member_id,OLD.dog_id,clock_timestamp())
   ON CONFLICT(member_id,dog_id) DO UPDATE SET reset_at=EXCLUDED.reset_at;
  DELETE FROM public.go_interactions WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id;
  DELETE FROM public.go_affinity WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id;
  SELECT name INTO deleted_dog FROM public.dogs WHERE id=OLD.dog_id;
  UPDATE public.go_members SET avatar_dog=NULL WHERE id=OLD.member_id AND avatar_dog=deleted_dog;
 END IF;
 RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS go_battle_last_card_removed ON public.go_cards;
CREATE TRIGGER go_battle_last_card_removed AFTER DELETE ON public.go_cards
FOR EACH ROW EXECUTE FUNCTION public.go_battle_cleanup_last_card();
DROP TRIGGER IF EXISTS go_stage3_official_owned_last_card ON public.go_official_owned;
CREATE TRIGGER go_stage3_official_owned_last_card AFTER DELETE ON public.go_official_owned
FOR EACH ROW EXECUTE FUNCTION public.go_battle_cleanup_last_card();
DROP TRIGGER IF EXISTS go_stage3_hidden_last_card ON public.go_official_hidden;
CREATE TRIGGER go_stage3_hidden_last_card AFTER DELETE ON public.go_official_hidden
FOR EACH ROW EXECUTE FUNCTION public.go_battle_cleanup_last_card();

CREATE OR REPLACE FUNCTION public.go_dog_battle_totals(p_member uuid)
RETURNS TABLE(dog_id uuid,wins bigint,draws bigint,losses bigint)
LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT x.dog_id,count(*) FILTER(WHERE outcome='win'),count(*) FILTER(WHERE outcome='draw'),count(*) FILTER(WHERE outcome='loss')
 FROM (
  SELECT r.dog_id,r.outcome,r.created_at FROM public.go_random_dog_records r WHERE r.member_id=p_member
  UNION ALL
  SELECT p.dog_id,p.outcome,p.finished_at FROM public.go_pvp_records p WHERE p.member_id=p_member AND p.dog_id IS NOT NULL
 ) x
 WHERE public.go_stage3_has_any_card(p_member,x.dog_id)
 AND NOT EXISTS(SELECT 1 FROM public.go_dog_record_resets r WHERE r.member_id=p_member AND r.dog_id=x.dog_id AND r.reset_at>=x.created_at)
 GROUP BY x.dog_id
$$;
REVOKE ALL ON FUNCTION public.go_stage3_has_any_card(uuid,uuid),public.go_dog_battle_totals(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_stage3_has_any_card(uuid,uuid),public.go_dog_battle_totals(uuid) TO service_role;
COMMIT;
-- Unidentifiable historical NULL dog_id records stay untouched and require audit.
