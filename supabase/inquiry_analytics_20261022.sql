-- Add adoption inquiry-button clicks to the existing private analytics.
-- Apply after site_analytics_20261022.sql. No historical events are altered.
begin;

alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_type_check;
alter table public.site_analytics_events
  add constraint site_analytics_events_event_type_check
  check (event_type in ('page_view', 'share_click', 'inquiry_click'));

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
      count(*) filter (where event_type = 'share_click') as shares,
      count(*) filter (where event_type = 'inquiry_click') as inquiries
    from filtered group by 1
  ),
  monthly as (
    select to_char(timezone('Asia/Seoul', occurred_at), 'YYYY-MM') as month,
      count(distinct visitor_hash) filter (where event_type = 'page_view') as visitors,
      count(*) filter (where event_type = 'page_view' and dog_id is not null) as views,
      count(*) filter (where event_type = 'share_click') as shares,
      count(*) filter (where event_type = 'inquiry_click') as inquiries
    from filtered group by 1
  ),
  dog_totals as (
    select d.id, d.name, d.category,
      count(f.event_type) filter (where f.event_type = 'page_view') as views,
      count(f.event_type) filter (where f.event_type = 'share_click') as shares,
      count(f.event_type) filter (where f.event_type = 'inquiry_click') as inquiries
    from public.dogs d
    left join filtered f on f.dog_id = d.id
    group by d.id, d.name, d.category
  )
  select jsonb_build_object(
    'visitors', (select count(distinct visitor_hash) from filtered where event_type = 'page_view'),
    'detailViews', (select count(*) from filtered where event_type = 'page_view' and dog_id is not null),
    'shares', (select count(*) from filtered where event_type = 'share_click'),
    'inquiries', (select count(*) from filtered where event_type = 'inquiry_click'),
    'daily', coalesce((select jsonb_agg(jsonb_build_object(
      'day', day, 'visitors', visitors, 'views', views, 'shares', shares, 'inquiries', inquiries
    ) order by day) from daily), '[]'::jsonb),
    'monthly', coalesce((select jsonb_agg(jsonb_build_object(
      'day', month, 'visitors', visitors, 'views', views, 'shares', shares, 'inquiries', inquiries
    ) order by month) from monthly), '[]'::jsonb),
    'dogs', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'category', category, 'views', views, 'shares', shares, 'inquiries', inquiries
    ) order by views desc, shares desc, name) from dog_totals), '[]'::jsonb)
  );
$function$;

revoke all on function public.admin_site_analytics(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_site_analytics(timestamptz) to service_role;

commit;
