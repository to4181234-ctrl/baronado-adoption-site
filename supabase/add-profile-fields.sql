-- 기존 dogs 행과 원문 description을 보존하면서 추가 항목만 생성합니다.
alter table public.dogs add column if not exists age_reference_date date;
alter table public.dogs add column if not exists age_reference_years smallint;
alter table public.dogs add column if not exists age_auto_update boolean not null default false;
alter table public.dogs add column if not exists shelter_name text not null default '';
alter table public.dogs add column if not exists shelter_url text not null default '';
alter table public.dogs add column if not exists story jsonb;
