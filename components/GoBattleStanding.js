'use client';
import {useEffect,useState} from 'react';
export default function GoBattleStanding(){
 const [data,setData]=useState(null),[page,setPage]=useState(0);
 useEffect(()=>{let active=true;fetch('/api/go/battle/standings',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Unavailable');return r.json()}).then(result=>{if(active)setData(result.records||[])}).catch(()=>{if(active)setData([])});return()=>{active=false}},[]);
 const items=data||[],maxPage=Math.max(1,Math.ceil(items.length/3)),shown=items.slice(page*3,page*3+3);
 return <div className="v3-battle-standing">
  <b>멍멍이별 대결 전적</b>
  {!items.length?<p>아직 대결 전적이 없어요. 멍카드 2장을 모아보세요.</p>:<>
   <div className="v3-battle-standing-list">{shown.map(d=><p key={d.id}>{d.name} 카드　{d.wins}승 · {d.draws}무 · {d.losses}패</p>)}</div>
   <div className="v3-battle-standing-pager"><button type="button" disabled={page===0} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page+1} / {maxPage}</span><button type="button" disabled={page+1>=maxPage} onClick={()=>setPage(p=>p+1)}>다음</button></div>
  </>}
 </div>;
}
