-- Extend disposable stage-one DB fixture (never Supabase production).
ALTER TABLE public.dogs ADD COLUMN name text NOT NULL DEFAULT '깡지';
ALTER TABLE public.dogs ADD COLUMN adopted boolean NOT NULL DEFAULT false;
ALTER TABLE public.go_cards ADD COLUMN image_path text NOT NULL DEFAULT 'legacy/photo.webp';
ALTER TABLE public.go_cards ADD COLUMN photo_style text NOT NULL DEFAULT 'original';
ALTER TABLE public.go_cards ADD COLUMN title text NOT NULL DEFAULT '기존 멍카드';
ALTER TABLE public.go_cards ADD COLUMN description text NOT NULL DEFAULT '기존 기록';
ALTER TABLE public.go_cards ADD COLUMN cuteness smallint NOT NULL DEFAULT 3;
ALTER TABLE public.go_cards ADD COLUMN charm smallint NOT NULL DEFAULT 3;
ALTER TABLE public.go_cards ADD COLUMN affection smallint NOT NULL DEFAULT 3;
ALTER TABLE public.go_cards ADD COLUMN captured_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.go_cards ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
INSERT INTO public.go_members(id) VALUES('88888888-8888-4888-8888-888888888888');
INSERT INTO public.dogs(id,category,name,adopted)
 VALUES('99999999-9999-4999-8999-999999999999','adoption','버디',false);
