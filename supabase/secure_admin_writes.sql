-- IMPORTANT: Apply only AFTER at least one authorized user has signed in and
-- their auth.users.id has been manually added to public.site_admins.
-- This replaces insecure anonymous write privileges.
-- Keep public READ access for adoption profiles.
--
-- Example for approved administrator only (replace email with confirmed address):
-- insert into public.site_admins(user_id)
-- select id from auth.users where email = '<approved-admin-email>'
-- on conflict (user_id) do nothing;
--
-- Check count(*) > 0 BEFORE applying these policies.

begin;
do $$
begin
 if not exists (select 1 from public.site_admins) then
   raise exception 'Administrator not enrolled. Refusing to lock editing access.';
 end if;
end $$;

drop policy if exists "public dogs insert" on public.dogs;
drop policy if exists "public dogs update" on public.dogs;
drop policy if exists "public dogs delete" on public.dogs;
drop policy if exists "site admin dogs insert" on public.dogs;
drop policy if exists "site admin dogs update" on public.dogs;
drop policy if exists "site admin dogs delete" on public.dogs;

create policy "site admin dogs insert" on public.dogs
for insert to authenticated
with check (exists(select 1 from public.site_admins a where a.user_id = (select auth.uid())));
create policy "site admin dogs update" on public.dogs
for update to authenticated
using (exists(select 1 from public.site_admins a where a.user_id = (select auth.uid())))
with check (exists(select 1 from public.site_admins a where a.user_id = (select auth.uid())));
create policy "site admin dogs delete" on public.dogs
for delete to authenticated
using (exists(select 1 from public.site_admins a where a.user_id = (select auth.uid())));

drop policy if exists "public dog images insert" on storage.objects;
drop policy if exists "public dog images update" on storage.objects;
drop policy if exists "public dog images delete" on storage.objects;
drop policy if exists "site admin images insert" on storage.objects;
drop policy if exists "site admin images update" on storage.objects;
drop policy if exists "site admin images delete" on storage.objects;

create policy "site admin images insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'dog-images' and exists(select 1 from public.site_admins a where a.user_id = (select auth.uid())));
create policy "site admin images update" on storage.objects
for update to authenticated
using (bucket_id = 'dog-images' and exists(select 1 from public.site_admins a where a.user_id = (select auth.uid())))
with check (bucket_id = 'dog-images' and exists(select 1 from public.site_admins a where a.user_id = (select auth.uid())));
create policy "site admin images delete" on storage.objects
for delete to authenticated
using (bucket_id = 'dog-images' and exists(select 1 from public.site_admins a where a.user_id = (select auth.uid())));
commit;
