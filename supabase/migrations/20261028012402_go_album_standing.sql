create function public.go_album_standing(p_member uuid,p_dog uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
with scores as (
 select c.member_id,count(*)::integer as score
 from public.go_cards c join public.go_members m on m.id=c.member_id
 join public.dogs d on d.id=c.dog_id
 where c.status='approved' and c.dog_id=p_dog and not m.disabled and d.category='adoption'
 group by c.member_id
), mine as (select coalesce((select score from scores where member_id=p_member),0) as score),
stats as (select count(*)::integer as participants,count(*) filter(where s.score>mine.score)::integer as ahead,count(*) filter(where s.score>=mine.score)::integer as at_or_above from scores s cross join mine)
select jsonb_build_object('collected',mine.score,'participants',stats.participants,'rank',case when mine.score>0 then stats.ahead+1 else null end,'percentile',case when mine.score>0 and stats.participants>=10 then ceil(100.0*stats.at_or_above/stats.participants)::integer else null end)
from mine cross join stats;
$$;
revoke all on function public.go_album_standing(uuid,uuid) from public,anon,authenticated;
grant execute on function public.go_album_standing(uuid,uuid) to service_role;
