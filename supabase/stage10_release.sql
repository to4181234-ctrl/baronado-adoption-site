-- Stage 10 production release: approved by user request to complete deployment.
BEGIN;
SET LOCAL lock_timeout='5s';
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
create table if not exists public.site_banners(
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 60),
 image_url text not null,
 target_type text not null default 'none' check(target_type in ('none','adoption','resident','go','external')),
 target_url text,
 enabled boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.site_banners enable row level security;
revoke all on public.site_banners from anon, authenticated;
create or replace function public.site_banners_limit_three() returns trigger language plpgsql SET search_path=public as $$
begin
 perform pg_advisory_xact_lock(624261);
 if (select count(*) from public.site_banners) >= 3 then
  raise exception 'Maximum 3 banners including hidden banners';
 end if;
 return new;
end;$$;
drop trigger if exists trg_site_banners_limit_three on public.site_banners;
create trigger trg_site_banners_limit_three before insert on public.site_banners
for each row execute function public.site_banners_limit_three();

ALTER TABLE public.site_banners ADD COLUMN IF NOT EXISTS image_alt text NOT NULL DEFAULT '';
ALTER TABLE public.site_banners ADD CONSTRAINT site_banners_image_alt_check CHECK(char_length(image_alt)<=200);
REVOKE ALL ON FUNCTION public.site_banners_limit_three() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.site_banners_limit_three() TO service_role;
INSERT INTO public.site_banners(title,image_url,image_alt) VALUES('기본 바로나도 배너','/figma-v3/hero-logo.svg','바로나도 로고와 강아지 캐릭터');

CREATE OR REPLACE FUNCTION public.go_reorder_site_banners(ordered_ids uuid[], enabled_ids uuid[] DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 -- Serialize against all inserts, deletes and concurrent reorder calls.
 LOCK TABLE public.site_banners IN SHARE ROW EXCLUSIVE MODE;
 IF ordered_ids IS NULL OR cardinality(ordered_ids)>3
    OR cardinality(ordered_ids)<>(SELECT count(DISTINCT x) FROM unnest(ordered_ids) x)
    OR cardinality(ordered_ids)<>(SELECT count(*) FROM public.site_banners)
    OR (enabled_ids IS NOT NULL AND EXISTS(SELECT 1 FROM unnest(enabled_ids) x WHERE x IS NULL OR NOT (x=ANY(ordered_ids))))
    OR EXISTS(SELECT 1 FROM unnest(ordered_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.site_banners b WHERE b.id=x)) THEN
  RAISE EXCEPTION 'Banner list changed; reload before reordering' USING ERRCODE='40001';
 END IF;
 UPDATE public.site_banners b SET sort_order=ordered.position::integer-1, enabled=CASE WHEN enabled_ids IS NULL THEN b.enabled ELSE b.id=ANY(enabled_ids) END
 FROM unnest(ordered_ids) WITH ORDINALITY AS ordered(id,position)
 WHERE b.id=ordered.id;
END $$;
REVOKE ALL ON FUNCTION public.go_reorder_site_banners(uuid[],uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_reorder_site_banners(uuid[],uuid[]) TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.site_banners TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
