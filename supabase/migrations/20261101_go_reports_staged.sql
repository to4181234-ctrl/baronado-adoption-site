-- STAGED ONLY. APPLY ONLY AFTER USER APPROVAL. Existing report rows are preserved.
alter table public.go_reports drop constraint if exists go_reports_reason_check;
alter table public.go_reports add constraint go_reports_reason_check check(reason in ('privacy','wrong_dog','inappropriate','unrelated','spam','other'));
alter table public.go_reports add column if not exists detail text;
alter table public.go_reports add column if not exists review_status text not null default 'pending';
alter table public.go_reports add column if not exists review_action text;
alter table public.go_reports add column if not exists reviewed_at timestamptz;
alter table public.go_reports add constraint go_reports_detail_check check(reason <> 'other' or (detail is not null and char_length(btrim(detail)) between 10 and 300)) not valid;
alter table public.go_reports add constraint go_reports_review_status_check check(review_status in ('pending','completed')) not valid;
alter table public.go_reports add constraint go_reports_review_action_check check(review_action is null or review_action in ('no_issue','hide','delete')) not valid;
-- Preserve moderation evidence after a card is deleted. Never retain photos in audit log.
create table if not exists public.go_report_audit_log (
 id uuid primary key default gen_random_uuid(),
 card_id uuid not null,
 reporting_member_id uuid,
 reported_at timestamptz,
 reason text not null,
 detail text,
 action text not null check(action in ('no_issue','hide','delete')),
 reviewed_at timestamptz not null default now()
);
alter table public.go_report_audit_log add column if not exists reported_at timestamptz;
alter table public.go_report_audit_log enable row level security;
-- One preserved audit outcome per card/reporter even when a whole card is deleted.
create unique index if not exists go_report_audit_card_reporter_unique
 on public.go_report_audit_log(card_id,reporting_member_id);
grant select,insert,update,delete on public.go_report_audit_log to service_role;
revoke all on public.go_report_audit_log from anon,authenticated;
create or replace function public.review_go_report(p_card_id uuid,p_member_id uuid,p_action text)
returns text language plpgsql security definer set search_path=public as $$
declare report_row record;
begin
 if p_action not in ('no_issue','hide','delete') then raise exception 'Invalid review action' using errcode='22023';end if;
 select * into report_row from public.go_reports where card_id=p_card_id and member_id=p_member_id and review_status='pending' for update;
 if not found then raise exception 'Report is already handled' using errcode='P0002';end if;
 insert into public.go_report_audit_log(card_id,reporting_member_id,reported_at,reason,detail,action) values(p_card_id,p_member_id,report_row.created_at,report_row.reason,report_row.detail,p_action)
 on conflict(card_id,reporting_member_id) do nothing;
 if p_action='hide' then
  update public.go_cards set status='hidden',reviewed_at=now() where id=p_card_id;
  delete from public.go_picks where card_id=p_card_id;
 end if;
 if p_action='delete' then
  -- Card deletion cascades to all linked reports. Preserve every reporter's
  -- review evidence first, including pending reports from other members.
  insert into public.go_report_audit_log(card_id,reporting_member_id,reported_at,reason,detail,action)
  select r.card_id,r.member_id,r.created_at,r.reason,r.detail,'delete'
  from public.go_reports r where r.card_id=p_card_id and r.member_id<>p_member_id
  on conflict(card_id,reporting_member_id) do nothing;
  delete from public.go_cards where id=p_card_id;
 else
  update public.go_reports set review_status='completed',review_action=p_action,reviewed_at=now() where card_id=p_card_id and member_id=p_member_id;
 end if;
 return p_action;
end $$;
revoke all on function public.review_go_report(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.review_go_report(uuid,uuid,text) to service_role;

-- A completed report is visible in the admin history even if the referenced card was deleted.
create or replace view public.go_report_moderation_index as
 with review_events as (
  select card_id,member_id,reason,detail,created_at,review_status,review_action,reviewed_at
  from public.go_reports r where r.review_status='pending'
  or not exists(select 1 from public.go_report_audit_log a where a.card_id=r.card_id and a.reporting_member_id=r.member_id)
  union all
  select card_id,reporting_member_id as member_id,reason,detail,coalesce(reported_at,reviewed_at) as created_at,
  'completed'::text as review_status,action as review_action,reviewed_at
  from public.go_report_audit_log
 )
 select e.*, coalesce(c.search_text,'') as search_text from review_events e
 left join public.go_card_index c on c.id=e.card_id;
revoke all on public.go_report_moderation_index from anon,authenticated;
grant select on public.go_report_moderation_index to service_role;
