-- PostgreSQL 17 fixture for isolated CI only.
DO $$BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
   CREATE ROLE service_role NOLOGIN BYPASSRLS;
 END IF;
END$$;
CREATE TABLE public.go_members (
 id uuid PRIMARY KEY,
 disabled boolean NOT NULL DEFAULT false
);
CREATE TABLE public.dogs (
 id uuid PRIMARY KEY,
 category text NOT NULL
);
CREATE TABLE public.go_cards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES public.go_members(id),
 dog_id uuid NOT NULL REFERENCES public.dogs(id),
 status text NOT NULL
);
INSERT INTO public.go_members(id) VALUES ('11111111-1111-4111-8111-111111111111');
INSERT INTO public.dogs(id,category) VALUES
 ('22222222-2222-4222-8222-222222222222','adoption'),
 ('33333333-3333-4333-8333-333333333333','adoption');
INSERT INTO public.go_cards(member_id,dog_id,status)
SELECT '11111111-1111-4111-8111-111111111111',id,'approved'
FROM public.dogs;
