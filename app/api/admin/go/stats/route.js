import {hasAdminSession} from '../../../../../lib/server/adminSession.js';
import {adminDatabase} from '../../../../../lib/server/adminData.js';
import {monthDate} from '../../../../../lib/goShared.js';
import {excludeTestAccounts} from '../../../../../lib/server/goStatsExcludedAccounts.js';

export const dynamic='force-dynamic';
export const runtime='nodejs';

async function allRows(factory){
 const pageSize=1000,rows=[];
 for(let offset=0;offset<50000;offset+=pageSize){
  const {data,error}=await factory(offset,pageSize);
  if(error)throw error;
  rows.push(...(data||[]));
  if((data||[]).length<pageSize)return rows;
 }
 throw Error('게시물 통계 집계 범위가 너무 커요.');
}

export async function GET(request){
 if(!await hasAdminSession(request))
  return Response.json({error:'관리자 로그인이 필요해요.'},{status:401});
 try{
  const rawMonth=new URL(request.url).searchParams.get('month');
  const month=rawMonth?monthDate(rawMonth):null;
  const start=month?`${month}T00:00:00+09:00`:null;
  // Derive the next calendar-month boundary in Korea local time.
  const [year,mm]=rawMonth?rawMonth.split('-').map(Number):[null,null];
  const end=month?new Date(Date.UTC(mm===12?year+1:year,mm===12?0:mm,1, -9)).toISOString():null;
  const db=adminDatabase();
  // The old RPC uses aggregate like_count and cannot remove likes made by
  // test accounts. Recompute the same legacy response read-only instead.
  const posts=await allRows((from,size)=>{
   let q=excludeTestAccounts(db.from('go_card_index')
    .select('id,dog_id,dog_name,title,nickname,status,created_at'),'member_id');
   if(start)q=q.gte('created_at',start).lt('created_at',end);
   return q.order('created_at',{ascending:false}).range(from,from+size-1);
  });
  const postIds=new Set(posts.map(p=>p.id));
  const likes=postIds.size?await allRows((from,size)=>
   excludeTestAccounts(db.from('go_likes').select('card_id'),'member_id')
    .range(from,from+size-1)):[];

  const likesByPost=new Map();
  for(const like of likes){
   if(!postIds.has(like.card_id))continue;
   likesByPost.set(like.card_id,(likesByPost.get(like.card_id)||0)+1);
  }
  const totals={posts:posts.length,published:0,pending:0,rejected:0,likes:0};
  const dogs=new Map();
  const top=[];
  for(const post of posts){
   if(post.status==='approved')totals.published++;
   else if(post.status==='pending')totals.pending++;
   else if(post.status==='rejected')totals.rejected++;
   const count=likesByPost.get(post.id)||0;
   totals.likes+=count;
   const dogKey=post.dog_id||'unassigned';
   if(!dogs.has(dogKey))dogs.set(dogKey,{dog_id:post.dog_id,dog_name:post.dog_name,posts:0,published:0,likes:0});
   const d=dogs.get(dogKey);
   d.posts++;if(post.status==='approved')d.published++;
   d.likes+=count;
   if(post.status==='approved')top.push({
    id:post.id,title:post.title,dog_name:post.dog_name,nickname:post.nickname,
    like_count:count,created_at:post.created_at
   });
  }
  top.sort((a,b)=>b.like_count-a.like_count||new Date(b.created_at)-new Date(a.created_at));
  return Response.json({
   totals,
   dogs:[...dogs.values()].sort((a,b)=>b.posts-a.posts||String(a.dog_name).localeCompare(String(b.dog_name),'ko')),
   topPosts:top.slice(0,10).map(({created_at,...post})=>post)
  },{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('MeongGO legacy stats failed:',e?.code||e?.message||'unknown');
  return Response.json({error:'통계를 불러오지 못했어요.'},{status:500,headers:{'Cache-Control':'no-store'}});
 }
}
