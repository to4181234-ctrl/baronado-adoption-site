-- Figma: deleting the final owned card returns that dog to uncollected,
-- removes its interaction history/friendship and resets its chosen avatar.
CREATE OR REPLACE FUNCTION public.go_battle_cleanup_last_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE deleted_dog text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.go_cards WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id AND status='approved') THEN
   DELETE FROM public.go_battles WHERE member_id=OLD.member_id AND (first_dog_id=OLD.dog_id OR second_dog_id=OLD.dog_id);
   DELETE FROM public.go_interactions WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id;
   DELETE FROM public.go_affinity WHERE member_id=OLD.member_id AND dog_id=OLD.dog_id;
   SELECT name INTO deleted_dog FROM public.dogs WHERE id=OLD.dog_id;
   UPDATE public.go_members SET avatar_dog=NULL WHERE id=OLD.member_id AND avatar_dog=deleted_dog;
 END IF;
 RETURN OLD;
END $$;
-- Previously created trigger go_battle_last_card_removed on public.go_cards
-- continues to execute the replaced function.
