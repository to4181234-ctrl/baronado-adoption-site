-- MeongGO 2nd-design battle stats and idempotent history
-- Source: Figma 40:28 battle timing, weighted stats and six-element cycle.
CREATE TABLE IF NOT EXISTS public.go_battle_card_stats (
 card_id uuid PRIMARY KEY REFERENCES public.go_cards(id) ON DELETE CASCADE,
 dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
 power smallint NOT NULL CHECK (power BETWEEN 1 AND 5),
 charm smallint NOT NULL CHECK (charm BETWEEN 1 AND 5),
 element text NOT NULL CHECK (element IN ('햇살','숲','물결','별빛','온기','꿈결')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.go_battle_card_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_battle_card_stats FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.go_battle_random_rating() RETURNS smallint
LANGUAGE sql VOLATILE SET search_path=public
AS $$
 SELECT CASE WHEN v < 0.1 THEN 1 WHEN v < 0.3 THEN 2
             WHEN v < 0.7 THEN 3 WHEN v < 0.9 THEN 4 ELSE 5 END::smallint
 FROM (SELECT random() AS v) AS draw;
$$;
REVOKE EXECUTE ON FUNCTION public.go_battle_random_rating() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.go_battle_dog_element(dogname text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path=public
AS $$
 SELECT CASE dogname WHEN '깡지' THEN '햇살'
   WHEN '뽀실' THEN '숲' WHEN '구름' THEN '물결'
   WHEN '버디' THEN '별빛' WHEN '오레오' THEN '온기'
   ELSE '꿈결' END;
$$;
REVOKE EXECUTE ON FUNCTION public.go_battle_dog_element(text) FROM PUBLIC,anon,authenticated;

INSERT INTO public.go_battle_card_stats(card_id,dog_id,power,charm,element)
 SELECT c.id,c.dog_id,public.go_battle_random_rating(),public.go_battle_random_rating(),
 public.go_battle_dog_element(d.name)
 FROM public.go_cards c JOIN public.dogs d ON d.id=c.dog_id
ON CONFLICT (card_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.go_battle_new_card_stats() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE dogname text;
BEGIN
 SELECT d.name INTO dogname FROM public.dogs d WHERE d.id=NEW.dog_id;
 INSERT INTO public.go_battle_card_stats(card_id,dog_id,power,charm,element)
 VALUES(NEW.id,NEW.dog_id,public.go_battle_random_rating(),public.go_battle_random_rating(),public.go_battle_dog_element(dogname))
 ON CONFLICT(card_id) DO NOTHING;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS go_battle_card_created ON public.go_cards;
CREATE TRIGGER go_battle_card_created AFTER INSERT ON public.go_cards
FOR EACH ROW EXECUTE FUNCTION public.go_battle_new_card_stats();

CREATE TABLE IF NOT EXISTS public.go_battles (
 id uuid PRIMARY KEY,
 member_id uuid NOT NULL REFERENCES public.go_members(id) ON DELETE CASCADE,
 first_card_id uuid NOT NULL,
 second_card_id uuid NOT NULL CHECK (first_card_id <> second_card_id),
 first_dog_id uuid NOT NULL,
 second_dog_id uuid NOT NULL CHECK (first_dog_id <> second_dog_id),
 first_power smallint NOT NULL CHECK (first_power BETWEEN 1 AND 5),
 first_charm smallint NOT NULL CHECK (first_charm BETWEEN 1 AND 5),
 first_element text NOT NULL,
 first_bonus smallint NOT NULL CHECK (first_bonus IN (0,2)),
 first_score smallint NOT NULL,
 second_power smallint NOT NULL CHECK (second_power BETWEEN 1 AND 5),
 second_charm smallint NOT NULL CHECK (second_charm BETWEEN 1 AND 5),
 second_element text NOT NULL,
 second_bonus smallint NOT NULL CHECK (second_bonus IN (0,2)),
 second_score smallint NOT NULL,
 winner text NOT NULL CHECK (winner IN ('first','second','draw')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS go_battles_member_date ON public.go_battles(member_id,created_at DESC);
ALTER TABLE public.go_battles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_battles FROM anon,authenticated;
