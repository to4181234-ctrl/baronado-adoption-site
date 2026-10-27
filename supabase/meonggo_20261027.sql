-- 멍멍GO 계정/카드/좋아요. 모든 쓰기는 서버의 서비스 역할만 사용합니다.
create table if not exists public.go_members (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  nickname_key text not null unique,
  password_hash text not null,
  recovery_hash text not null,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint go_nickname_length check (char_length(nickname) between 2 and 14)
);

create table if not exists public.go_cards (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete restrict,
  member_id uuid not null references public.go_members(id) on delete restrict,
  image_path text not null unique,
  photo_style text not null check (photo_style in ('original','cutout')),
  description text not null default '' check (char_length(description) <= 200),
  captured_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','approved','rejected','hidden')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists go_cards_public_feed on public.go_cards(created_at desc, id desc) where status='approved';
create index if not exists go_cards_dog_feed on public.go_cards(dog_id, created_at desc) where status='approved';
create index if not exists go_cards_owner on public.go_cards(member_id, created_at desc);

create table if not exists public.go_likes (
  member_id uuid not null references public.go_members(id) on delete cascade,
  card_id uuid not null references public.go_cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, card_id)
);
create index if not exists go_likes_card on public.go_likes(card_id);

create table if not exists public.go_auth_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists go_auth_attempts_ip_time on public.go_auth_attempts(ip_hash, created_at desc);

alter table public.go_members enable row level security;
alter table public.go_cards enable row level security;
alter table public.go_likes enable row level security;
alter table public.go_auth_attempts enable row level security;
revoke all on public.go_members, public.go_cards, public.go_likes, public.go_auth_attempts from anon, authenticated;
revoke all on sequence public.go_auth_attempts_id_seq from anon, authenticated;
grant all on public.go_members, public.go_cards, public.go_likes, public.go_auth_attempts to service_role;
grant usage, select on sequence public.go_auth_attempts_id_seq to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('go-cards', 'go-cards', false, 3145728, array['image/webp','image/png'])
on conflict (id) do update set public=false, file_size_limit=3145728,
  allowed_mime_types=array['image/webp','image/png'];
