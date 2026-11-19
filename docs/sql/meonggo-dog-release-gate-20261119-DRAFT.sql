-- PREDEPLOY / ISOLATED DATABASE ONLY. Requires go_official_* schema.
-- No existing members, cards, draw history, affection, or battle records are deleted.
CREATE TABLE IF NOT EXISTS public.go_dog_pixel_assets (
 dog_id uuid PRIMARY KEY REFERENCES public.dogs(id) ON DELETE RESTRICT,
 care_path text,
 thumbnail_path text,
 is_published boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.go_dog_pixel_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.go_dog_pixel_assets FROM anon,authenticated,public;
-- Only service role and trusted server routes may write/read private storage paths.
GRANT ALL ON public.go_dog_pixel_assets TO service_role;

CREATE OR REPLACE FUNCTION public.go_dog_release_ready(p_dog uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $fn$
 SELECT EXISTS (
  SELECT 1 FROM public.go_dog_pixel_assets px
  JOIN public.go_official_sets st ON st.dog_id=px.dog_id
  JOIN public.go_official_versions v ON v.id=st.current_version AND v.status='published'
  JOIN public.dogs d ON d.id=px.dog_id AND d.category='adoption'
  WHERE px.dog_id=p_dog AND px.is_published
  AND nullif(px.care_path,'') IS NOT NULL AND nullif(px.thumbnail_path,'') IS NOT NULL
  AND 5=(SELECT COUNT(DISTINCT a.slot) FROM public.go_official_assets a
   WHERE a.version_id=st.current_version AND a.slot BETWEEN 1 AND 5
   AND nullif(trim(a.title),'') IS NOT NULL AND nullif(a.display_path,'') IS NOT NULL)
 );
$fn$;
REVOKE ALL ON FUNCTION public.go_dog_release_ready(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.go_dog_release_ready(uuid) TO service_role;
-- Transactional server gate for purchases and normal draw ownership. The API also
-- filters all choices, preventing selecting a draft/unpublished dog in the UI.
CREATE OR REPLACE FUNCTION public.go_dog_official_release_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
BEGIN
 IF NOT public.go_dog_release_ready(NEW.dog_id) THEN
  RAISE EXCEPTION 'dog content not published';
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.go_dog_official_release_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.go_dog_official_release_guard() TO service_role;
DROP TRIGGER IF EXISTS go_dog_release_guard_owned ON public.go_official_owned;
CREATE TRIGGER go_dog_release_guard_owned BEFORE INSERT ON public.go_official_owned
 FOR EACH ROW EXECUTE FUNCTION public.go_dog_official_release_guard();
DROP TRIGGER IF EXISTS go_dog_release_guard_purchase ON public.go_official_purchases;
CREATE TRIGGER go_dog_release_guard_purchase BEFORE INSERT ON public.go_official_purchases
 FOR EACH ROW EXECUTE FUNCTION public.go_dog_official_release_guard();
