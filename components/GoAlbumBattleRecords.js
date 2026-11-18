'use client';
import {useState} from 'react';

// Approved home panel, Figma 558:312818. One dog's cumulative record per page.
export default function GoAlbumBattleRecords({dogs,records={},member,ready,compact=false}){
 const [page,setPage]=useState(0);
 const entries=dogs.filter(dog=>records[dog.id]).map(dog=>({dog,stats:records[dog.id]}));
 const total=Math.max(1,entries.length),current=Math.min(page,total-1);
 const entry=entries[current];
 return <section className={"v3-battle-home v3-approved-battle-records"+(compact?" v3-records-compact":"")} aria-label="멍배틀 전적">
  {!compact&&<h2>멍배틀 전적</h2>}
  <div className="v3-pixel-panel"><div className="v10-panel-canvas">
   {['bg','outer','inner'].map(name=><img key={name} className={'v3-album-panel-layer v3-album-panel-'+name} src={'/figma-v3/album-panel-'+name+'.svg'} alt=""/>)}
   <div className="v3-panel-content">
    <b>멍멍이별 대결 전적</b>
    <p aria-live="polite">{!member?'로그인하면 전적을 확인할 수 있어요.':!ready?'전적을 불러오는 중…':entry?`${entry.dog.name} 카드  ${entry.stats.wins}승 · ${entry.stats.draws}무 · ${entry.stats.losses}패`:'멍배틀을 하고 기록을 쌓아보세요.'}</p>
   </div>
  </div></div>
  <nav className="v3-battle-record-pagination" aria-label="멍멍이별 전적 페이지">
   <button type="button" disabled={current===0} onClick={()=>setPage(current-1)}>이전</button>
   <span aria-live="polite">{current+1} / {total}</span>
   <button type="button" disabled={current===total-1} onClick={()=>setPage(current+1)}>다음</button>
  </nav>
 </section>;
}
