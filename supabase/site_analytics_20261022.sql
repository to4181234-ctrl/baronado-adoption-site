-- Private, pseudonymous, first-party site statistics.
-- Events are written only by the authenticated server service role;
-- visitors cannot read or write this table directly.
create table if not exists public.site_analytics_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('page_view', 'share_click')),
  page_key text not null check (page_key = 'home' or page_key = 'residents' or page_key like 'dog:%'),
  dog_id uuid references public.dogs(id) on delete set null,
  visitor_hash text not null check (length(visitor_hash) = 64),
  bucket_start timestamptz not null,
  occurred_at timestamptz not null default now(),
  constraint site_analytics_events_dedupe unique(visitor_hash, event_type, page_key, bucket_start)
);
create index if not exists site_analytics_events_occurrence_idx
  on public.site_analytics_events (occurred_at desc);
create index if not exists site_analytics_events_dog_occurrence_idx
  on public.site_analytics_events (dog_id, occurred_at desc);
alter table public.site_analytics_events enable row level security;
revoke all on public.site_analytics_events from public, anon, authenticated;
grant select, insert on public.site_analytics_events to service_role;
grant usage, select on sequence public.site_analytics_events_id_seq to service_role;

-- SECURITY INVOKER uses service_role's DB permissions.
-- The RPC is not available to the anonymous/public API key.
create or replace function public.admin_site_analytics(p_start timestamptz default null)
returns jsonb
language sql stable security invoker
set search_path = public
as $function$
  with filtered as materialized (
    select event_type, page_key, dog_id, visitor_hash, occurred_at
    from public.site_analytics_events
    where p_start is null or occurred_at >= p_start
  ),
  daily as (
    select timezone('Asia/Seoul', occurred_at)::date as day,
      count(distinct visitor_hash) filter (where event_type = 'page_view') as visitors,
      count(*) filter (where event_type = 'page_view' and dog_id is not null) as views,
      count(*) filter (where event_type = 'share_click') as shares
    from filtered group by 1
  ),
  monthly as (
    select to_char(timezone('Asia/Seoul', occurred_at), 'YYYY-MM') as month,
      count(distinct visitor_hash) filter (where event_type = 'page_view') as visitors,
      count(*) filter (where event_type = 'page_view' and dog_id is not null) as views,
      count(*) filter (where event_type = 'share_click') as shares
    from filtered group by 1
  ),
  dog_totals as (
    select d.id, d.name, d.category,
      count(f.event_type) filter (where f.event_type = 'page_view') as views,
      count(f.event_type) filter (where f.event_type = 'share_click') as shares
    from public.dogs d
    left join filtered f on f.dog_id = d.id
    group by d.id, d.name, d.category
  )
  select jsonb_build_object(
    'visitors', (select count(distinct visitor_hash) from filtered where event_type = 'page_view'),
    'detailViews', (select count(*) from filtered where event_type = 'page_view' and dog_id is not null),
    'shares', (select count(*) from filtered where event_type = 'share_click'),
    'daily', coalesce((select jsonb_agg(jsonb_build_object(
      'day', day, 'visitors', visitors, 'views', views, 'shares', shares
    ) order by day) from daily), '[]'::jsonb),
    'monthly', coalesce((select jsonb_agg(jsonb_build_object(
      'day', month, 'visitors', visitors, 'views', views, 'shares', shares
    ) order by month) from monthly), '[]'::jsonb),
    'dogs', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'category', category, 'views', views, 'shares', shares
    ) order by views desc, shares desc, name) from dog_totals), '[]'::jsonb)
  );
$function$;
revoke all on function public.admin_site_analytics(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_site_analytics(timestamptz) to service_role;
