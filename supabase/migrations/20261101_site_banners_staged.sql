-- STAGED ONLY: DO NOT APPLY TO PRODUCTION WITHOUT EXPRESS USER APPROVAL.
-- Banners intentionally use service-role API authorization, not public table grants.
create table if not exists public.site_banners (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 1 and 80),
 alt text not null check (length(btrim(alt)) between 1 and 200),
 image_url text not null,
 link_type text not null default 'none' check (link_type in ('none','adoption','resident','go','external')),
 external_url text,
 visible boolean not null default true,
 display_order integer not null check (display_order between 1 and 3),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint banner_external_url check (link_type <> 'external' or external_url ~ '^https://[^[:space:]]+$')
);
alter table public.site_banners enable row level security;
grant select,insert,update,delete on public.site_banners to service_role;
revoke all on public.site_banners from anon,authenticated;
-- service_role retains bypass RLS; all reads/writes are mediated by server routes.
create or replace function public.limit_site_banners() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(1482918302);
 if (select count(*) from public.site_banners)>=3 then
  raise exception 'Only three site banners may be registered' using errcode='23514';
 end if;
 return new;
end $$;
drop trigger if exists enforce_site_banner_limit on public.site_banners;
create trigger enforce_site_banner_limit before insert on public.site_banners for each row execute function public.limit_site_banners();
create or replace function public.set_site_banner_order(ordered_ids uuid[]) returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(1482918302);
 if ordered_ids is null or cardinality(ordered_ids)!=(select count(*) from public.site_banners)
    or (select count(distinct v) from unnest(ordered_ids) v)!=cardinality(ordered_ids)
    or exists(select 1 from unnest(ordered_ids) v where not exists(select 1 from public.site_banners b where b.id=v)) then
  raise exception 'Invalid banner order' using errcode='22023';
 end if;
 update public.site_banners b set display_order=t.ordinal,updated_at=now()
 from unnest(ordered_ids) with ordinality t(id,ordinal) where b.id=t.id;
end $$;
revoke all on function public.set_site_banner_order(uuid[]) from public,anon,authenticated;
grant execute on function public.set_site_banner_order(uuid[]) to service_role;
revoke all on function public.limit_site_banners() from public,anon,authenticated;

-- Deleted banners leave a contiguous 1..N display order, including hidden banners.
create or replace function public.compact_site_banner_order() returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(1482918302);
 update public.site_banners b set display_order=ranked.num,updated_at=now()
 from (select id,row_number() over (order by display_order,created_at,id) as num from public.site_banners) ranked
 where b.id=ranked.id and b.display_order<>ranked.num;
 return null;
end $$;
drop trigger if exists compact_site_banners_on_delete on public.site_banners;
create trigger compact_site_banners_on_delete after delete on public.site_banners for each statement execute function public.compact_site_banner_order();
revoke all on function public.compact_site_banner_order() from public,anon,authenticated;
