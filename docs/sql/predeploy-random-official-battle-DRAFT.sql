-- REVIEW DRAFT ONLY: stage5 random battle with official NO.1-5 + custom cards.
-- NEVER run against production before isolated DB E2E and explicit approval.
-- Existing go_battles rows remain unchanged (defaults are camera).
BEGIN;
ALTER TABLE public.go_battles ADD COLUMN IF NOT EXISTS first_kind text NOT NULL DEFAULT 'camera';
ALTER TABLE public.go_battles ADD COLUMN IF NOT EXISTS first_slot smallint;
ALTER TABLE public.go_battles ADD COLUMN IF NOT EXISTS second_kind text NOT NULL DEFAULT 'camera';
ALTER TABLE public.go_battles ADD COLUMN IF NOT EXISTS second_slot smallint;
ALTER TABLE public.go_battles DROP CONSTRAINT IF EXISTS go_battles_first_card_kind;
ALTER TABLE public.go_battles DROP CONSTRAINT IF EXISTS go_battles_second_card_kind;
ALTER TABLE public.go_battles ADD CONSTRAINT go_battles_first_card_kind
 CHECK ((first_kind='camera' AND first_slot IS NULL) OR (first_kind='official' AND first_slot BETWEEN 1 AND 5));
ALTER TABLE public.go_battles ADD CONSTRAINT go_battles_second_card_kind
 CHECK ((second_kind='camera' AND second_slot IS NULL) OR (second_kind='official' AND second_slot BETWEEN 1 AND 5));
-- For official cards the *_card_id UUID stores dog_id; *_kind + *_slot disambiguate it.
-- No historical battle history, balance, or custom card stats are deleted or recalculated.
COMMIT;
