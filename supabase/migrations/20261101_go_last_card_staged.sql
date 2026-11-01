-- STAGED ONLY: execute only on explicit approval; production data has not been touched.
-- Count battle outcomes for the EXECUTING ACCOUNT, separately for each dog.
-- Independent per-dog counters preserve another dog's record when a last card is removed.
create table if not exists public.go_dog_battle_records (
 member_id uuid not null references public.go_members(id) on delete cascade,
 dog_id uuid not null references public.dogs(id) on delete cascade,
 wins bigint not null default 0 check(wins >= 0),
 draws bigint not null default 0 check(draws >= 0),
 losses bigint not null default 0 check(losses >= 0),
 updated_at timestamptz not null default now(),
 primary key(member_id,dog_id)
);
alter table public.go_dog_battle_records enable row level security;
revoke all on public.go_dog_battle_records from anon,authenticated;
grant select,insert,update,delete on public.go_dog_battle_records to service_role;
-- Backfill from the historical, immutable battle snapshots, not current card ratings.
with outcomes as (
 select member_id, first_dog_id as dog_id,
        (winner='first')::int as w,(winner='draw')::int as d,(winner='second')::int as l from public.go_battles
 union all
 select member_id,second_dog_id as dog_id,
        (winner='second')::int as w,(winner='draw')::int as d,(winner='first')::int as l from public.go_battles
), totals as (
 select member_id,dog_id,sum(w) as wins,sum(d) as draws,sum(l) as losses from outcomes group by member_id,dog_id
)
insert into public.go_dog_battle_records(member_id,dog_id,wins,draws,losses)
select t.member_id,t.dog_id,t.wins,t.draws,t.losses from totals t
where exists(select 1 from public.go_cards c where c.member_id=t.member_id and c.dog_id=t.dog_id)
on conflict(member_id,dog_id) do nothing;
create or replace function public.go_update_dog_battle_records() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.go_dog_battle_records(member_id,dog_id,wins,draws,losses)
 values(new.member_id,new.first_dog_id,(new.winner='first')::int,(new.winner='draw')::int,(new.winner='second')::int)
 on conflict(member_id,dog_id) do update set
 wins=public.go_dog_battle_records.wins+excluded.wins,
 draws=public.go_dog_battle_records.draws+excluded.draws,
 losses=public.go_dog_battle_records.losses+excluded.losses,updated_at=now();
 insert into public.go_dog_battle_records(member_id,dog_id,wins,draws,losses)
 values(new.member_id,new.second_dog_id,(new.winner='second')::int,(new.winner='draw')::int,(new.winner='first')::int)
 on conflict(member_id,dog_id) do update set
 wins=public.go_dog_battle_records.wins+excluded.wins,
 draws=public.go_dog_battle_records.draws+excluded.draws,
 losses=public.go_dog_battle_records.losses+excluded.losses,updated_at=now();
 return new;
end $$;
drop trigger if exists update_go_dog_battle_records_after_insert on public.go_battles;
create trigger update_go_dog_battle_records_after_insert after insert on public.go_battles
for each row execute function public.go_update_dog_battle_records();
-- Remove only this dog's acquisition/affinity/win-loss state when the member's last card disappears.
-- The other dogs' battle outcome counters and cards are untouched.
create or replace function public.go_reset_dog_after_last_card() returns trigger language plpgsql security definer set search_path=public as $$
declare dog_name text;
begin
 if not exists (select 1 from public.go_cards c where c.member_id=old.member_id and c.dog_id=old.dog_id) then
  delete from public.go_affinity where member_id=old.member_id and dog_id=old.dog_id;
  delete from public.go_interactions where member_id=old.member_id and dog_id=old.dog_id;
  delete from public.go_dog_battle_records where member_id=old.member_id and dog_id=old.dog_id;
  -- Any completion stamp involving the no-longer-acquired dog is no longer active.
  delete from public.go_collection_badges where member_id=old.member_id and old.dog_id=any(dog_ids);
  select name into dog_name from public.dogs where id=old.dog_id;
  if dog_name is not null then
   update public.go_members set avatar_dog=null where id=old.member_id and avatar_dog=dog_name;
  end if;
 end if;
 return old;
end $$;
drop trigger if exists reset_go_dog_after_last_card_delete on public.go_cards;
create trigger reset_go_dog_after_last_card_delete after delete on public.go_cards
for each row execute function public.go_reset_dog_after_last_card();
revoke all on function public.go_update_dog_battle_records() from public,anon,authenticated;
revoke all on function public.go_reset_dog_after_last_card() from public,anon,authenticated;
