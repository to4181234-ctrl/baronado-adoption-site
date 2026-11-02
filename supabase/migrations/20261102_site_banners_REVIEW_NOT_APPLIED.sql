-- REVIEW ONLY. Do NOT apply to operating Supabase without explicit user approval.
create table if not exists public.site_banners(
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 60),
 image_url text not null,
 target_type text not null default 'none' check(target_type in ('none','adoption','resident','go','external')),
 target_url text,
 enabled boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.site_banners enable row level security;
revoke all on public.site_banners from anon, authenticated;
-- Enforce 3 records including hidden banners even for concurrent writers.
create or replace function public.site_banners_limit_three() returns trigger language plpgsql as $$
begin
 perform pg_advisory_xact_lock(624261);
 if (select count(*) from public.site_banners) >= 3 then
  raise exception 'Maximum 3 banners including hidden banners';
 end if;
 return new;
end;$$;
drop trigger if exists trg_site_banners_limit_three on public.site_banners;
create trigger trg_site_banners_limit_three before insert on public.site_banners
for each row execute function public.site_banners_limit_three();
