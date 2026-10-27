-- No inferred scores for existing photos: unset scores remain NULL.
alter table public.go_cards add column cuteness smallint check (cuteness between 1 and 5);
alter table public.go_cards add column charm smallint check (charm between 1 and 5);
alter table public.go_cards add column affection smallint check (affection between 1 and 5);

-- Preserve the existing view column order and append the new fields.
create or replace view public.go_card_index with (security_invoker=true) as
select c.id,c.dog_id,c.member_id,c.image_path,c.photo_style,c.description,c.captured_at,
 c.status,c.reviewed_at,c.created_at,c.title,c.rejection_reason,c.rejection_note,
 d.name as dog_name,d.adopted as dog_adopted,d.category as dog_category,m.nickname,
 (select count(*) from public.go_likes l where l.card_id=c.id) as like_count,
 (select count(*) from public.go_reports r where r.card_id=c.id) as report_count,
 concat_ws(' ',c.title,c.description,d.name,m.nickname) as search_text,
 c.cuteness,c.charm,c.affection
from public.go_cards c join public.dogs d on d.id=c.dog_id join public.go_members m on m.id=c.member_id;
revoke all on public.go_card_index from public,anon,authenticated;
grant select on public.go_card_index to service_role;

-- An explicit desired state makes retries idempotent; NULL supports old clients.
create function public.go_set_like(p_card uuid,p_member uuid,p_liked boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare desired boolean; total bigint;
begin
 perform 1 from public.go_cards where id=p_card and status='approved' for update;
 if not found then raise exception 'card not public'; end if;
 if not exists(select 1 from public.go_members where id=p_member and disabled=false) then raise exception 'member unavailable'; end if;
 desired:=coalesce(p_liked,not exists(select 1 from public.go_likes where card_id=p_card and member_id=p_member));
 if desired then
  insert into public.go_likes(member_id,card_id) values(p_member,p_card) on conflict(member_id,card_id) do nothing;
 else
  delete from public.go_likes where member_id=p_member and card_id=p_card;
 end if;
 select count(*) into total from public.go_likes where card_id=p_card;
 return jsonb_build_object('liked',desired,'likeCount',total);
end $$;
revoke all on function public.go_set_like(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.go_set_like(uuid,uuid,boolean) to service_role;
