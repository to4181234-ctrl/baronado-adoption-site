-- SECURITY: Public SELECT is allowed. INSERT/UPDATE/DELETE are performed ONLY
-- by authenticated Next.js API routes using server-only Supabase service role.
-- Never set anon write policies on public.dogs or storage.objects.
-- 바로나도 입양 사이트 Supabase 초기/업데이트 세팅 SQL
-- Supabase > SQL Editor > New query 에 붙여넣고 Run 하면 됩니다.

create extension if not exists "pgcrypto";

create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  name text not null default '이름 미정',
  gender text not null default '여자',
  neutered boolean not null default false,
  age text not null default '나이 미정',
  description text not null default '',
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.dogs add column if not exists category text not null default 'adoption';
alter table public.dogs add column if not exists adopted boolean not null default false;
alter table public.dogs add column if not exists arrived_at date;
alter table public.dogs add column if not exists adopted_at date;
alter table public.dogs add column if not exists profile jsonb not null default '{}'::jsonb;

alter table public.dogs enable row level security;

drop policy if exists "public dogs select" on public.dogs;
drop policy if exists "public dogs insert" on public.dogs;
drop policy if exists "public dogs update" on public.dogs;
drop policy if exists "public dogs delete" on public.dogs;

create policy "public dogs select"
on public.dogs for select
to anon, authenticated
using (true);




insert into storage.buckets (id, name, public)
values ('dog-images', 'dog-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public dog images select" on storage.objects;
drop policy if exists "public dog images insert" on storage.objects;
drop policy if exists "public dog images update" on storage.objects;
drop policy if exists "public dog images delete" on storage.objects;

create policy "public dog images select"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'dog-images');



