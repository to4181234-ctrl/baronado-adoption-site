create table public.go_album_covers (
 member_id uuid not null references public.go_members(id) on delete cascade,
 dog_id uuid not null references public.dogs(id) on delete cascade,
 card_id uuid not null references public.go_cards(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(member_id,dog_id)
);
create index go_album_covers_card on public.go_album_covers(card_id);
alter table public.go_album_covers enable row level security;
revoke all on public.go_album_covers from public,anon,authenticated;
grant all on public.go_album_covers to service_role;

create table public.go_collection_badges (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.go_members(id) on delete cascade,
 roster_key text not null check(roster_key ~ '^[a-f0-9]{64}$'),
 dog_ids uuid[] not null,
 dog_count integer not null check(dog_count>0 and dog_count=cardinality(dog_ids)),
 earned_at timestamptz not null default now(),
 unique(member_id,roster_key)
);
alter table public.go_collection_badges enable row level security;
revoke all on public.go_collection_badges from public,anon,authenticated;
grant all on public.go_collection_badges to service_role;

create function public.go_set_album_cover(p_member uuid,p_dog uuid,p_card uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if p_card is null then
  delete from public.go_album_covers where member_id=p_member and dog_id=p_dog;
  return;
 end if;
 perform 1 from public.go_cards where id=p_card and member_id=p_member and dog_id=p_dog for share;
 if not found then raise exception 'owned card not found'; end if;
 insert into public.go_album_covers(member_id,dog_id,card_id) values(p_member,p_dog,p_card)
 on conflict(member_id,dog_id) do update set card_id=excluded.card_id;
end $$;
revoke all on function public.go_set_album_cover(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.go_set_album_cover(uuid,uuid,uuid) to service_role;

create function public.go_edit_owned_card(p_member uuid,p_card uuid,p_edit_content boolean,p_edit_ratings boolean,p_title text,p_description text,p_dog uuid,p_cuteness smallint,p_charm smallint,p_affection smallint) returns uuid
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
  status=case when content_changed then 'pending' else status end,
  reviewed_at=case when content_changed then null else reviewed_at end,
  rejection_reason=case when content_changed then null else rejection_reason end,
  rejection_note=case when content_changed then null else rejection_note end
 where id=p_card and member_id=p_member;
 return p_card;
end $$;
revoke all on function public.go_edit_owned_card(uuid,uuid,boolean,boolean,text,text,uuid,smallint,smallint,smallint) from public,anon,authenticated;
grant execute on function public.go_edit_owned_card(uuid,uuid,boolean,boolean,text,text,uuid,smallint,smallint,smallint) to service_role;
