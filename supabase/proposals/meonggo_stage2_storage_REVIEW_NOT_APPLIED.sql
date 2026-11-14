-- REVIEW ONLY. Run on a properly configured Supabase TEST branch first.
-- The bucket remains private: unowned photos and HIDDEN illustrations may
-- only be returned to authenticated owners via short-lived signed URLs.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('go-official-cards','go-official-cards',false,5242880,ARRAY['image/webp','image/png'])
ON CONFLICT(id) DO NOTHING;
-- Never create public SELECT/INSERT policies: only trusted service-role APIs
-- access original and display assets. No production data is changed by this file.
