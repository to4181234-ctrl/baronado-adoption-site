create table if not exists public.go_reports (
  member_id uuid not null references public.go_members(id) on delete cascade,
  card_id uuid not null references public.go_cards(id) on delete cascade,
  reason text not null check (reason in ('privacy','wrong_dog','inappropriate')),
  created_at timestamptz not null default now(),
  primary key (member_id, card_id)
);
create index if not exists go_reports_card on public.go_reports(card_id);
alter table public.go_reports enable row level security;
revoke all on public.go_reports from anon, authenticated;
grant all on public.go_reports to service_role;
