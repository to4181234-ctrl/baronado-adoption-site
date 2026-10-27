-- Additive update: existing accounts, images, likes and descriptions are preserved.
alter table public.go_cards add column if not exists title text not null default '';
alter table public.go_cards add column if not exists rejection_reason text;
alter table public.go_cards add column if not exists rejection_note text;
update public.go_cards c set title = d.name || '의 기록' from public.dogs d where d.id=c.dog_id and c.title='';
alter table public.go_cards add constraint go_title_length check (char_length(title) <= 80);
alter table public.go_cards add constraint go_rejection_reason check (rejection_reason is null or rejection_reason in ('no_dog','wrong_dog','privacy','quality','inappropriate','other'));
alter table public.go_cards add constraint go_rejection_note check (rejection_note is null or char_length(rejection_note) <= 300);

alter table public.go_members add column if not exists email text;
alter table public.go_members add column if not exists session_version integer not null default 0;
create unique index if not exists go_members_email on public.go_members(lower(email)) where email is not null;

create table public.go_picks (
  month date not null check (extract(day from month)=1),
  slot integer not null check (slot between 1 and 3),
  card_id uuid not null references public.go_cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (month, slot), unique(month, card_id)
);
alter table public.go_picks enable row level security;
revoke all on public.go_picks from public, anon, authenticated;
grant all on public.go_picks to service_role;

create view public.go_card_index with (security_invoker=true) as
select c.*, d.name as dog_name, d.adopted as dog_adopted, d.category as dog_category, m.nickname,
  (select count(*) from public.go_likes l where l.card_id=c.id) as like_count,
  (select count(*) from public.go_reports r where r.card_id=c.id) as report_count,
  concat_ws(' ', c.title,c.description,d.name,m.nickname) as search_text
from public.go_cards c join public.dogs d on d.id=c.dog_id join public.go_members m on m.id=c.member_id;
revoke all on public.go_card_index from public, anon, authenticated;
grant select on public.go_card_index to service_role;

create function public.go_set_pick(p_month date, p_card uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare free_slot integer;
begin
  if extract(day from p_month)<>1 then raise exception 'invalid month'; end if;
  perform pg_advisory_xact_lock(hashtext('go-pick-' || p_month::text)::bigint);
  if not exists(select 1 from public.go_cards where id=p_card and status='approved') then raise exception 'not approved'; end if;
  if exists(select 1 from public.go_picks where month=p_month and card_id=p_card) then return; end if;
  select s into free_slot from generate_series(1,3) s where not exists(select 1 from public.go_picks p where p.month=p_month and p.slot=s) order by s limit 1;
  if free_slot is null then raise exception 'pick limit'; end if;
  insert into public.go_picks(month,slot,card_id) values(p_month,free_slot,p_card);
end $$;
revoke all on function public.go_set_pick(date,uuid) from public,anon,authenticated;
grant execute on function public.go_set_pick(date,uuid) to service_role;

create function public.go_post_stats(p_month date default null) returns jsonb
language sql stable security invoker set search_path='' as $$
with selected as (
 select * from public.go_card_index
 where p_month is null or (created_at >= (p_month::timestamp at time zone 'Asia/Seoul') and created_at < ((p_month + interval '1 month')::timestamp at time zone 'Asia/Seoul'))
), dog_counts as (
 select dog_id,dog_name,count(*) as posts,count(*) filter(where status='approved') as published,sum(like_count) as likes
 from selected group by dog_id,dog_name order by posts desc,dog_name
), top_posts as (
 select id,title,dog_name,nickname,like_count from selected where status='approved' order by like_count desc,created_at desc limit 10
)
select jsonb_build_object(
 'totals',(select jsonb_build_object('posts',count(*),'published',count(*) filter(where status='approved'),'pending',count(*) filter(where status='pending'),'rejected',count(*) filter(where status='rejected'),'likes',coalesce(sum(like_count),0)) from selected),
 'dogs',coalesce((select jsonb_agg(to_jsonb(dog_counts)) from dog_counts),'[]'::jsonb),
 'topPosts',coalesce((select jsonb_agg(to_jsonb(top_posts)) from top_posts),'[]'::jsonb)
);
$$;
revoke all on function public.go_post_stats(date) from public,anon,authenticated;
grant execute on function public.go_post_stats(date) to service_role;

create table public.go_email_challenges (
 id uuid primary key,
 email text not null,
 purpose text not null check(purpose in ('register','recover','link')),
 member_id uuid references public.go_members(id) on delete cascade,
 token_hash text not null,
 attempts integer not null default 0,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 verified_at timestamptz,
 used_at timestamptz
);
create index go_email_challenges_email_time on public.go_email_challenges(email,created_at desc);
alter table public.go_email_challenges enable row level security;
revoke all on public.go_email_challenges from public,anon,authenticated;
grant all on public.go_email_challenges to service_role;

create function public.go_verify_email_code(p_id uuid,p_hash text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare challenge public.go_email_challenges;
begin
 select * into challenge from public.go_email_challenges where id=p_id for update;
 if not found or challenge.used_at is not null or challenge.expires_at<=now() or challenge.attempts>=5 then return null; end if;
 update public.go_email_challenges set attempts=attempts+1 where id=p_id;
 if challenge.token_hash<>p_hash then return null; end if;
 update public.go_email_challenges set verified_at=now() where id=p_id;
 return jsonb_build_object('id',challenge.id,'email',challenge.email,'purpose',challenge.purpose,'memberId',challenge.member_id);
end $$;
revoke all on function public.go_verify_email_code(uuid,text) from public,anon,authenticated;
grant execute on function public.go_verify_email_code(uuid,text) to service_role;

create function public.go_complete_email_action(p_challenge uuid,p_member uuid,p_nickname text,p_key text,p_password_hash text,p_recovery_hash text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare challenge public.go_email_challenges; person public.go_members;
begin
 select * into challenge from public.go_email_challenges where id=p_challenge for update;
 if not found or challenge.used_at is not null or challenge.verified_at is null or challenge.expires_at<=now() then raise exception 'verification expired'; end if;
 if challenge.purpose='register' then
   if p_nickname is null or p_key is null or p_password_hash is null or p_recovery_hash is null then raise exception 'invalid registration'; end if;
   insert into public.go_members(nickname,nickname_key,password_hash,recovery_hash,email) values(p_nickname,p_key,p_password_hash,p_recovery_hash,challenge.email) returning * into person;
 elsif challenge.purpose='recover' then
   if p_password_hash is null then raise exception 'password required'; end if;
   update public.go_members set password_hash=p_password_hash,session_version=session_version+1 where email=challenge.email and disabled=false returning * into person;
   if not found then raise exception 'account not found'; end if;
 elsif challenge.purpose='link' then
   if challenge.member_id is null or challenge.member_id is distinct from p_member then raise exception 'member mismatch'; end if;
   update public.go_members set email=challenge.email where id=p_member and disabled=false returning * into person;
   if not found then raise exception 'account not found'; end if;
 else raise exception 'invalid purpose'; end if;
 update public.go_email_challenges set used_at=now() where id=p_challenge;
 return jsonb_build_object('id',person.id,'nickname',person.nickname,'email',person.email,'session_version',person.session_version);
end $$;
revoke all on function public.go_complete_email_action(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.go_complete_email_action(uuid,uuid,text,text,text,text) to service_role;

alter table public.go_auth_attempts add column if not exists subject_hash text;
create index if not exists go_auth_attempts_subject_time on public.go_auth_attempts(subject_hash,created_at desc);
