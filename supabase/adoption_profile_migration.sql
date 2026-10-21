-- Add optional adoption details without modifying existing descriptions or resident dogs.
-- Review and apply before deploying code that reads these fields.
alter table public.dogs
  add column if not exists arrived_at date,
  add column if not exists adopted_at date,
  add column if not exists profile jsonb not null default '{}'::jsonb;

-- Security warning: existing RLS policies grant insert/update/delete to anonymous users.
-- Do not run this migration as a substitute for proper administrator authentication.
-- Before production release, configure Supabase Auth administrator(s), protect
-- /admin routes and replace public write/storage policies with admin-only policies.
