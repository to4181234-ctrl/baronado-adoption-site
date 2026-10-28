alter table public.go_members add column profile_bio text not null default '' check(char_length(profile_bio)<=100);
create function public.go_public_recorder(p_member uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
select jsonb_build_object('id',m.id,'nickname',m.nickname,'bio',m.profile_bio,
 'publicCards',(select count(*) from public.go_cards c where c.member_id=m.id and c.status='approved'),
 'dogs',(select count(distinct c.dog_id) from public.go_cards c where c.member_id=m.id and c.status='approved'))
from public.go_members m where m.id=p_member and not m.disabled;
$$;
revoke all on function public.go_public_recorder(uuid) from public,anon,authenticated;
grant execute on function public.go_public_recorder(uuid) to service_role;
