-- Saved photos are personal: this aggregate is only callable by the server role.
create function public.go_album_photo_counts(p_member uuid)
returns table(dog_id uuid,photo_count bigint)
language sql stable security invoker set search_path='' as $$
 select c.dog_id,count(*) as photo_count
 from public.go_cards c
 where c.member_id=p_member
 group by c.dog_id;
$$;
revoke all on function public.go_album_photo_counts(uuid) from public,anon,authenticated;
grant execute on function public.go_album_photo_counts(uuid) to service_role;
