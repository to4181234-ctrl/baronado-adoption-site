-- SYNTHETIC TEST DATA ONLY; no production identifiers or secrets.

INSERT INTO public.go_members(id,nickname,nickname_key,password_hash,recovery_hash) VALUES
 ('11111111-1111-4111-8111-111111111111','기록가가','qausera','hash-a','recover-a'),
 ('22222222-2222-4222-8222-222222222222','기록가나','qauserb','hash-b','recover-b');
INSERT INTO public.dogs(id,name) VALUES
 ('33333333-3333-4333-8333-333333333333','깡지'),
 ('44444444-4444-4444-8444-444444444444','카우');
INSERT INTO public.go_cards(id,dog_id,member_id,image_path,photo_style,status,title)
VALUES
 ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','qa/a.png','original','approved','기존 카드 A'),
 ('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','qa/b.png','original','approved','기존 카드 B');
INSERT INTO public.go_battle_card_stats(card_id,dog_id,power,charm,element) VALUES
 ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333',3,4,'햇살'),
 ('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444',4,5,'숲');
INSERT INTO public.go_coin_wallets(member_id,balance) VALUES
 ('11111111-1111-4111-8111-111111111111',800),
 ('22222222-2222-4222-8222-222222222222',100);
INSERT INTO public.go_coin_transactions(member_id,amount,event_type,source_key,local_day)
VALUES('11111111-1111-4111-8111-111111111111',10,'care','qa:historic:one',current_date-1);
INSERT INTO public.go_official_sets(dog_id) VALUES
 ('33333333-3333-4333-8333-333333333333'),
 ('44444444-4444-4444-8444-444444444444');
INSERT INTO public.go_official_versions(id,dog_id,status)
VALUES
 ('77777777-7777-4777-8777-777777777777','33333333-3333-4333-8333-333333333333','published'),
 ('88888888-8888-4888-8888-888888888888','44444444-4444-4444-8444-444444444444','published');
UPDATE public.go_official_sets SET current_version=
 CASE WHEN dog_id='33333333-3333-4333-8333-333333333333' THEN '77777777-7777-4777-8777-777777777777'::uuid
 ELSE '88888888-8888-4888-8888-8888888888...[truncated]