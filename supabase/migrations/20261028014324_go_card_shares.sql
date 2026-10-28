alter table public.go_cards add column share_count bigint not null default 0 check (share_count>=0);
create table public.go_card_share_events (
 event_id uuid primary key,
 card_id uuid not null references public.go_cards(id) on delete cascade,
 actor_key text not null,
 kind text not null check(kind in ('save','share','download')),
 created_at timestamptz not null default now()
);
create index go_card_share_actor_time on public.go_card_share_events(actor_key,created_at desc);
create index go_card_share_card on public.go_card_share_events(card_id);
alter table public.go_card_share_events enable row level security;
revoke all on public.go_card_share_events from public,anon,authenticated;
grant all on public.go_card_share_events to service_role;
create or replace view public.go_card_index with (security_invoker=true) as
select c.id,c.dog_id,c.member_id,c.image_path,c.photo_style,c.description,c.captured_at,
 c.status,c.reviewed_at,c.created_at,c.title,c.rejection_reason,c.rejection_note,
 d.name as dog_name,d.adopted as dog_adopted,d.category as dog_category,m.nickname,
 (select count(*) from public.go_likes l where l.card_id=c.id) as like_count,
 (select count(*) from public.go_reports r where r.card_id=c.id) as report_count,
 concat_ws(' ',c.title,c.description,d.name,m.nickname) as search_text,
 c.cuteness,c.charm,c.affection,c.share_count
from public.go_cards c join public.dogs d on d.id=c.dog_id join public.go_members m on m.id=c.member_id;
revoke all on public.go_card_index from public,anon,authenticated;
grant select on public.go_card_index to service_role;


create function public.go_record_card_share(p_card uuid,p_member uuid,p_event uuid,p_actor text,p_kind text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare owner_id uuid; total bigint; inserted integer;
begin
 select member_id,share_count into owner_id,total from public.go_cards where id=p_card and status='approved' for update;
 if not found then raise exception 'card not public'; end if;
 if p_member=owner_id then return jsonb_build_object('shareCount',total,'counted',false); end if;
 if p_member is not null and not exists(select 1 from public.go_members where id=p_member and not disabled) then raise exception 'member unavailable'; end if;
 if p_actor is null or length(p_actor)>100 or p_kind not in ('save','share','download') then raise exception 'invalid share'; end if;
 if exists(select 1 from public.go_card_share_events where event_id=p_event) then return jsonb_build_object('shareCount',total,'counted',false); end if;
 if (select count(*) from public.go_card_share_events where actor_key=p_actor and created_at>now()-interval '1 minute')>=30 then raise exception 'rate limit'; end if;
 insert into public.go_card_share_events(event_id,card_id,actor_key,kind) values(p_event,p_card,p_actor,p_kind) on conflict(event_id) do nothing;
 get diagnostics inserted=row_count;
 if inserted=1 then update public.go_cards set share_count=share_count+1 where id=p_card returning share_count into total; end if;
 return jsonb_build_object('shareCount',total,'counted',inserted=1);
end $$;
revoke all on function public.go_record_card_share(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.go_record_card_share(uuid,uuid,uuid,text,text) to service_role;
