-- REVIEW ONLY. Not applied to any database by this task.
-- Apply only to an approved non-production database first.
-- Keeps legacy reasons and the existing (member_id,card_id) unique key.
BEGIN;
ALTER TABLE public.go_reports ADD COLUMN IF NOT EXISTS reason_detail text NOT NULL DEFAULT '';
ALTER TABLE public.go_reports ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.go_reports ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.go_reports DROP CONSTRAINT IF EXISTS go_reports_reason_check;
ALTER TABLE public.go_reports ADD CONSTRAINT go_reports_reason_check
 CHECK (reason IN ('privacy','wrong_dog','inappropriate','unrelated','spam','other'));
ALTER TABLE public.go_reports DROP CONSTRAINT IF EXISTS go_reports_reason_detail_check;
ALTER TABLE public.go_reports ADD CONSTRAINT go_reports_reason_detail_check
 CHECK (char_length(reason_detail)<=300 AND (reason<>'other' OR char_length(btrim(reason_detail)) BETWEEN 10 AND 300));
ALTER TABLE public.go_reports DROP CONSTRAINT IF EXISTS go_reports_review_status_check;
ALTER TABLE public.go_reports ADD CONSTRAINT go_reports_review_status_check CHECK(status IN ('pending','reviewed'));
ALTER TABLE public.go_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_reports FROM anon, authenticated;
GRANT ALL ON public.go_reports TO service_role;
COMMIT;
-- No automatic hiding/deletion and no changes to existing reports or card status.
