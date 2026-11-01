import {adminDatabase,validId} from '../../../../../lib/server/adminData.js';
import {hasAdminSession} from '../../../../../lib/server/adminSession.js';
import {apiResponse} from '../../../../../lib/server/adminHttp.js';
import {periodRange,groupKey,safeCsv,kstDate} from '../../../../../lib/goStatsPeriod.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 if(!hasAdminSession(request))return apiResponse({error:'관리자 로그인이 필요해요.'},401);
 try{
  const params=new URL(request.url).searchParams;
  const selection=params.get('range')||'30';
  const db=adminDatabase();
  let start=params.get('start'),end=params.get('end');
  let days=selection==='7'?7:30;
  if(selection==='month'){end=kstDate(new Date());start=end.slice(0,7)+'-01'}
  if(selection==='all'){
   const {data:earliest,error:initialError}=await db.from('go_cards').select('created_at').order('created_at',{ascending:true}).limit(1);if(initialError)throw initialError;
   end=kstDate(new Date());start=earliest?.[0]?.created_at?kstDate(earliest[0].created_at):end;
  }
  if(selection!=='custom'&&selection!=='month'&&selection!=='all'){start=null;end=null}
  const period=periodRange({start,end,days});
  const dog=params.get('dog');if(dog&&dog!=='all'&&!validId(dog))return apiResponse({error:'강아지 필터를 확인해주세요.'},400);
  const rows=[];
  for(let offset=0;offset<50000;offset+=500){
   let q=db.from('go_card_index').select('id,title,created_at,dog_id,dog_name,nickname,status,like_count,share_count').gte('created_at',period.startIso).lt('created_at',period.endIso).order('created_at',{ascending:false}).range(offset,offset+499);
   if(dog&&dog!=='all')q=q.eq('dog_id',dog);
   const {data,error}=await q;if(error)throw error;
   rows.push(...data);if(data.length<500)break;
  }
  if(rows.length>=50000)return apiResponse({error:'조회 결과가 50,000건을 초과해 통계를 계산할 수 없어요. 기간을 좁혀주세요.'},413);
  const {data:dogs,error:dogError}=await db.from('dogs').select('id,name').order('name');if(dogError)throw dogError;
  const buckets=new Map(),byDog=new Map();
  for(const c of rows){const key=groupKey(c.created_at,period.group);const entry=buckets.get(key)||{date:key,total:0,published:0,likes:0};entry.total++;entry.published+=Number(c.status==='approved');entry.likes+=Number(c.like_count)||0;buckets.set(key,entry);
   const d=byDog.get(c.dog_id)||{id:c.dog_id,name:c.dog_name||'강아지',total:0,published:0,likes:0};d.total++;d.published+=Number(c.status==='approved');d.likes+=Number(c.like_count)||0;byDog.set(c.dog_id,d)
  }
  const ranking=rows.slice().sort((a,b)=>(Number(b.like_count)||0)-(Number(a.like_count)||0));
  const totals={total:rows.length,published:rows.filter(c=>c.status==='approved').length,likes:rows.reduce((a,c)=>a+(Number(c.like_count)||0),0),shares:rows.reduce((a,c)=>a+(Number(c.share_count)||0),0)};
  if(params.get('download')==='1'){
   const csv='\uFEFF'+[['발급일','카드 제목','강아지','작성자','노출 상태','좋아요','저장·공유'].join(','),...rows.map(c=>[c.created_at,c.title,c.dog_name,c.nickname,c.status,c.like_count,c.share_count].map(safeCsv).join(','))].join('\r\n');
   return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="baronado-go-stats-${period.first}-${period.last}.csv"`,'Cache-Control':'no-store'}});
  }
  const dogPage=Math.max(0,Math.min(1000,Number(params.get('dogPage'))||0)),postPage=Math.max(0,Math.min(1000,Number(params.get('postPage'))||0));
  const dogRows=[...byDog.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'ko'));
  return apiResponse({period,totals,chart:[...buckets.values()].sort((a,b)=>a.date.localeCompare(b.date)),dogs:dogs||[],dogRanking:{total:dogRows.length,items:dogRows.slice(dogPage*10,dogPage*10+10)},postRanking:{total:ranking.length,items:ranking.slice(postPage*5,postPage*5+5)},truncated:false});
 }catch(e){return apiResponse({error:e.message||'통계를 불러오지 못했어요.'},400)}
}
