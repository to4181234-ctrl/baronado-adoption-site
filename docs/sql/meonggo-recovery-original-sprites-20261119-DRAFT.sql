-- Runtime recovery migration. Existing user cards, affection, battles and coins untouched.
-- All links reference already published, immutable Figma assets in this Next.js repo.
-- Do not invent a title for the legacy Oreo HIDDEN card, which has an original image.
BEGIN;
ALTER TABLE public.go_dog_pixel_assets ADD COLUMN IF NOT EXISTS legacy_existing boolean NOT NULL DEFAULT false;
WITH legacy(dog_name,key) AS (
 VALUES ('깡지','kangji'),('버디','buddy'),('뽀실','pposil'),('구름','gureum'),('오레오','oreo')
)
INSERT INTO public.go_dog_pixel_assets(dog_id,care_path,thumbnail_path,is_published,legacy_existing)
SELECT d.id,'/figma-v3/'||legacy.key||'-side.png',
 '/figma-preview/dog-'||legacy.key||'.png',true,true
FROM public.dogs d JOIN legacy ON d.name=legacy.dog_name AND d.category='adoption'
WHERE EXISTS(SELECT 1 FROM public.go_official_sets s WHERE s.dog_id=d.id AND s.current_version IS NOT NULL)
ON CONFLICT(dog_id) DO UPDATE SET
  care_path=COALESCE(NULLIF(public.go_dog_pixel_assets.care_path,''),EXCLUDED.care_path),
  thumbnail_path=COALESCE(NULLIF(public.go_dog_pixel_assets.thumbnail_path,''),EXCLUDED.thumbnail_path),
  legacy_existing=true,
  -- Existing operator-published state remains unchanged. Newly seeded originals are public.
  is_published=public.go_dog_pixel_assets.is_published;
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
        AND nullif(a.display_path,'') IS NOT NULL
        AND (nullif(trim(a.title),'') IS NOT NULL OR px.legacy_existing))
 );
$fn$;
REVOKE ALL ON FUNCTION public.go_dog_release_ready(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.go_dog_release_ready(uuid) TO service_role;
COMMIT;
