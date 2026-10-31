-- Clear an owner's battle history for a dog when the last owned card of that dog is removed.
-- Retain other players' snapshots: using someone else's card must not alter its owner's record.
CREATE OR REPLACE FUNCTION public.go_battle_cleanup_last_card()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.go_cards
    WHERE member_id = OLD.member_id AND dog_id = OLD.dog_id
  ) THEN
    DELETE FROM public.go_battles
    WHERE member_id = OLD.member_id
      AND (first_dog_id = OLD.dog_id OR second_dog_id = OLD.dog_id);
  END IF;
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS go_battle_last_card_removed ON public.go_cards;
CREATE TRIGGER go_battle_last_card_removed
AFTER DELETE ON public.go_cards
FOR EACH ROW EXECUTE FUNCTION public.go_battle_cleanup_last_card();
