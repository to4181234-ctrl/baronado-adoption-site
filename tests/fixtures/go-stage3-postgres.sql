-- Disposable PG17 schema shim: real go_members has nicknames already.
ALTER TABLE public.go_members ADD COLUMN IF NOT EXISTS nickname text NOT NULL DEFAULT '테스트 멍기록가';
