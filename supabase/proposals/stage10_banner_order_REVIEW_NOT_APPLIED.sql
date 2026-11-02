-- REVIEW ONLY. Not applied to any remote database.
-- Requires site_banners and its existing three-record limit trigger.
BEGIN;
CREATE OR REPLACE FUNCTION public.go_reorder_site_banners(ordered_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 -- Serialize against all inserts, deletes and concurrent reorder calls.
 LOCK TABLE public.site_banners IN SHARE ROW EXCLUSIVE MODE;
 IF ordered_ids IS NULL OR cardinality(ordered_ids)>3
    OR cardinality(ordered_ids)<>(SELECT count(DISTINCT x) FROM unnest(ordered_ids) x)
    OR cardinality(ordered_ids)<>(SELECT count(*) FROM public.site_banners)
    OR EXISTS(SELECT 1 FROM unnest(ordered_ids) x WHERE NOT EXISTS(SELECT 1 FROM public.site_banners b WHERE b.id=x)) THEN
  RAISE EXCEPTION 'Banner list changed; reload before reordering' USING ERRCODE='40001';
 END IF;
 UPDATE public.site_banners b SET sort_order=ordered.position::integer-1
 FROM unnest(ordered_ids) WITH ORDINALITY AS ordered(id,position)
 WHERE b.id=ordered.id;
END $$;
REVOKE ALL ON FUNCTION public.go_reorder_site_banners(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.go_reorder_site_banners(uuid[]) TO service_role;
-- The server's separately authenticated admin CRUD needs these table privileges.
GRANT SELECT,INSERT,UPDATE,DELETE ON public.site_banners TO service_role;
COMMIT;
