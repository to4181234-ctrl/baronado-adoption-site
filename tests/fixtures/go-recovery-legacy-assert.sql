-- On a disposable database; synthetic account and card records must survive.
DO $check$
DECLARE dog uuid:='33333333-3333-4333-8333-333333333333';
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='go_dog_pixel_assets' AND column_name='legacy_existing') THEN RAISE EXCEPTION 'legacy flag missing'; END IF;
 UPDATE public.go_dog_pixel_assets SET legacy_existing=false WHERE dog_id=dog;
 UPDATE public.go_official_assets SET title='' WHERE version_id='77777777-7777-4777-8777-777777777777'::uuid AND slot=5;
 IF public.go_dog_release_ready(dog) THEN RAISE EXCEPTION 'A new dog missing title was incorrectly public'; END IF;
 UPDATE public.go_dog_pixel_assets SET legacy_existing=true WHERE dog_id=dog;
 IF NOT public.go_dog_release_ready(dog) THEN RAISE EXCEPTION 'Existing original illustration without legacy title should stay public'; END IF;
 UPDATE public.go_dog_pixel_assets SET is_published=false WHERE dog_id=dog;
 IF public.go_dog_release_ready(dog) THEN RAISE EXCEPTION 'Explicitly unpublished dog leaked'; END IF;
 UPDATE public.go_dog_pixel_assets SET is_published=true WHERE dog_id=dog;
 IF (SELECT count(*) FROM public.go_cards)<>2 THEN RAISE EXCEPTION 'Custom history damaged'; END IF;
END $check$;
