-- Apply ONLY after the new password-based server API is deployed and the
-- Vercel environment includes SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD,
-- and ADMIN_SESSION_SECRET. Keep existing public READ access.
-- Supabase service-role bypasses RLS; browsers must no longer write directly.
begin;

alter table public.dogs enable row level security;
drop policy if exists "public dogs insert" on public.dogs;
drop policy if exists "public dogs update" on public.dogs;
drop policy if exists "public dogs delete" on public.dogs;
drop policy if exists "site admin dogs insert" on public.dogs;
drop policy if exists "site admin dogs update" on public.dogs;
drop policy if exists "site admin dogs delete" on public.dogs;

drop policy if exists "public dog images insert" on storage.objects;
drop policy if exists "public dog images update" on storage.objects;
drop policy if exists "public dog images delete" on storage.objects;
drop policy if exists "site admin images insert" on storage.objects;
drop policy if exists "site admin images update" on storage.objects;
drop policy if exists "site admin images delete" on storage.objects;

-- Public dog listing and images stay readable. The only write path is
-- the authenticated server API (service role or signed one-time upload URLs).
commit;
