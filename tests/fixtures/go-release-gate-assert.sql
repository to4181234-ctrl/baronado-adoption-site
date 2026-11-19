-- Disposable local PostgreSQL only. Runs after all prior fixtures pass.
DO $check$
DECLARE
 a uuid:='11111111-1111-4111-8111-111111111111';
 dog uuid:='33333333-3333-4333-8333-333333333333';
 r jsonb;before_cards integer;
BEGIN
 IF public.go_dog_release_ready(dog) THEN RAISE EXCEPTION 'Unregistered pixels were accidentally public'; END IF;
 INSERT INTO public.go_dog_pixel_assets(dog_id,care_path,thumbnail_path,is_published)
 VALUES(dog,'qa/pixel/care.png',null,true);
 IF public.go_dog_release_ready(dog) THEN RAISE EXCEPTION 'Missing thumbnail was public'; END IF;
 UPDATE public.go_dog_pixel_assets SET thumbnail_path='qa/pixel/thumbnail.png' WHERE dog_id=dog;
 IF public.go_dog_release_ready(dog) THEN RAISE EXCEPTION 'Incomplete HIDDEN title was public'; END IF;
 UPDATE public.go_official_assets SET title='히든 카드' WHERE version_id='77777777-7777-4777-8777-777777777777'::uuid AND slot=5;
 IF NOT public.go_dog_release_ready(dog) THEN RAISE EXCEPTION '4+1 & 2 pixel file published dog missing'; END IF;
 UPDATE public.go_dog_pixel_assets SET is_published=false WHERE dog_id=dog;
 IF public.go_dog_release_ready(dog) THEN RAISE EXCEPTION 'Admin unpublished dog was public'; END IF;
 UPDATE public.go_dog_pixel_assets SET is_published=true WHERE dog_id=dog;
 SELECT COUNT(*) INTO before_cards FROM public.go_official_owned WHERE member_id=a AND dog_id=dog;
 r:=public.go_official_bulk_delete(a,dog,ARRAY[4]::integer[]);
 IF r->>'ok'<>'true' OR (SELECT COUNT(*) FROM public.go_official_owned WHERE member_id=a AND dog_id=dog)<>before_cards-1
 THEN RAISE EXCEPTION 'Bulk owner deletion failed %',r; END IF;
 r:=public.go_official_bulk_delete(a,dog,ARRAY[4]::integer[]);
 IF r->>'ok'='true' THEN RAISE EXCEPTION 'Deleted card can be deleted a second time %',r; END IF;
 IF (SELECT COUNT(*) FROM public.go_members)<>2 OR (SELECT COUNT(*) FROM public.go_cards)<>2
 THEN RAISE EXCEPTION 'Existing accounts/custom cards corrupted'; END IF;
END $check$;
