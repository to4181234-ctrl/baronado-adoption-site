-- Idempotent 6-artwork migration. Existing users, cards, coins, battles untouched.
BEGIN;
ALTER TABLE public.go_dog_pixel_assets ADD COLUMN IF NOT EXISTS front_path text;
ALTER TABLE public.go_dog_pixel_assets ADD COLUMN IF NOT EXISTS side_path text;
ALTER TABLE public.go_dog_pixel_assets ADD COLUMN IF NOT EXISTS feed_path text;
ALTER TABLE public.go_dog_pixel_assets ADD COLUMN IF NOT EXISTS praise_path text;
ALTER TABLE public.go_dog_pixel_assets ADD COLUMN IF NOT EXISTS play_path text;
WITH figma(name,slug) AS (VALUES ('깡지','kangji'),('버디','buddy'),('뽀실','pposil'),('구름','gureum'),('오레오','oreo'))
UPDATE public.go_dog_pixel_assets px SET
 front_path=coalesce(nullif(px.front_path,''),'/figma-preview/dog-'||figma.slug||'.png'),
 side_path=coalesce(nullif(px.side_path,''),nullif(px.care_path,''),'/figma-v3/'||figma.slug||'-side.png'),
 feed_path=coalesce(nullif(px.feed_path,''),'/figma-v3/'||figma.slug||'-feed.png'),
 praise_path=coalesce(nullif(px.praise_path,''),'/figma-v3/'||figma.slug||'-praise.png'),
 play_path=coalesce(nullif(px.play_path,''),'/figma-v3/'||figma.slug||'-play.png')
FROM public.dogs d JOIN figma ON figma.name=d.name
WHERE px.dog_id=d.id AND d.category='adoption' AND px.legacy_existing;
CREATE OR REPLACE FUNCTION public.go_dog_release_ready(p_dog uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $fn$
 SELECT EXISTS (
  SELECT 1 FROM public.go_dog_pixel_assets px
  JOIN public.go_official_sets st ON st.dog_id=px.dog_id
  JOIN public.go_official_versions v ON v.id=st.current_version AND v.status='published'
  JOIN public.dogs d ON d.id=px.dog_id AND d.category='adoption'
  WHERE px.dog_id=p_dog AND px.is_published
    AND nullif(px.thumbnail_path,'') IS NOT NULL
    AND nullif(px.front_path,'') IS NOT NULL
    AND nullif(px.side_path,'') IS NOT NULL
    AND nullif(px.feed_path,'') IS NOT NULL
    AND nullif(px.praise_path,'') IS NOT NULL
    AND nullif(px.play_path,'') IS NOT NULL
    AND 5=(SELECT count(DISTINCT a.slot) FROM public.go_official_assets a
      WHERE a.version_id=st.current_version AND a.slot BETWEEN 1 AND 5
        AND nullif(a.display_path,'') IS NOT NULL
        AND (nullif(trim(a.title),'') IS NOT NULL OR px.legacy_existing))
 );$fn$;
REVOKE ALL ON FUNCTION public.go_dog_release_ready(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_dog_release_ready(uuid) TO service_role;
COMMIT;
