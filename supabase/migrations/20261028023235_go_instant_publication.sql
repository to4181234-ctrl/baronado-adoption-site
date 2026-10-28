-- Immediate publication; preserve posts already hidden by the administrator.
alter table public.go_cards alter column status set default 'approved';
update public.go_cards set status='approved' where status='pending';
create or replace function public.go_edit_owned_card(p_member uuid,p_card uuid,p_edit_content boolean,p_edit_ratings boolean,p_title text,p_description text,p_dog uuid,p_cuteness smallint,p_charm smallint,p_affection smallint) returns uuid
language plpgsql security invoker set search_path='' as $$
declare original public.go_cards; content_changed boolean := false;
begin
 select * into original from public.go_cards where id=p_card and member_id=p_member for update;
 if not found then raise exception 'owned card not found'; end if;
 if p_edit_content then
  if p_title is null or char_length(trim(p_title)) not between 1 and 80 or p_description is null or char_length(trim(p_description)) not between 1 and 200 then raise exception 'invalid text'; end if;
  if not exists(select 1 from public.dogs where id=p_dog and category='adoption') then raise exception 'dog not found'; end if;
  content_changed := original.title is distinct from p_title or original.description is distinct from p_description or original.dog_id is distinct from p_dog;
 end if;
 update public.go_cards set
  title=case when p_edit_content then p_title else title end,
  description=case when p_edit_content then p_description else description end,
  dog_id=case when p_edit_content then p_dog else dog_id end,
  cuteness=case when p_edit_ratings then p_cuteness else cuteness end,
  charm=case when p_edit_ratings then p_charm else charm end,
  affection=case when p_edit_ratings then p_affection else affection end,
  status=case when status='pending' then 'approved' else status end,
  reviewed_at=reviewed_at,
  rejection_reason=case when content_changed and original.status in ('approved','pending') then null else rejection_reason end,
  rejection_note=case when content_changed and original.status in ('approved','pending') then null else rejection_note end
 where id=p_card and member_id=p_member;
 return p_card;
end $$;
revoke all on function public.go_edit_owned_card(uuid,uuid,boolean,boolean,text,text,uuid,smallint,smallint,smallint) from public,anon,authenticated;
grant execute on function public.go_edit_owned_card(uuid,uuid,boolean,boolean,text,text,uuid,smallint,smallint,smallint) to service_role;
