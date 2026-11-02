'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import GoShell,{useGoSession} from './GoShell.js';
import GoCard from './GoCard.js';
import {figmaSprite} from '../lib/goV3Game.js';
function Recorder({id}){
 const {member}=useGoSession(),router=useRouter();
 const [data,setData]=useState(null),[page,setPage]=useState(0),[order,setOrder]=useState('newest'),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');fetch(`/api/go/recorders/${id}?page=${page}&order=${order}`,{cache:'no-store',signal:controller.signal}).then(async r=>{const result=await r.json();if(!r.ok)throw Error(result.error);if(controller.signal.aborted)return;const last=Math.max(0,Math.ceil(result.total/4)-1);if(page>last){setPage(last);return;}setData(result);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[id,page,order]);
 const profile=data?.profile;
 return <div className="v10-public-recorder">
  <button className="v10-recorder-back" type="button" onClick={()=>window.history.length>1?router.back():router.push('/go/community')}>‹ 뒤로</button>
  {profile&&<section className="v10-recorder-identity"><div className="v10-recorder-portrait"><img src={profile.avatarDog?figmaSprite(profile.avatarDog):'/figma-v3/album-shadow-gureum.svg'} alt={profile.avatarDog||'기본 실루엣'}/></div><h1>{profile.nickname}</h1><span>멍기록가</span><p>{profile.bio||'아직 작성된 소개가 없어요.'}</p></section>}
  <section className="v6-public-board v10-recorder-board" aria-label="멍기록가 공개 카드">
   <div className="v6-public-toolbar"><label>등록 순서ㅣ <select aria-label="멍기록가 기록 정렬" value={order} onChange={e=>{setOrder(e.target.value);setPage(0);}}><option value="newest">최신순</option><option value="oldest">오래된순</option></select></label></div>
   {error&&<p className="v6-public-message" role="alert">{error}</p>}
   {loading?<p className="v6-public-message" role="status">멍기록가의 공개 기록을 불러오고 있어요.</p>:!error&&data?.cards.length?<div className="v6-public-grid">{data.cards.map(card=><article className="v6-public-item" key={card.id}><GoCard card={card} member={member} compact linkToPost/><span className="v6-public-author">{profile.nickname} 멍기록가</span><time dateTime={card.createdAt||card.capturedAt}>{new Date(card.createdAt||card.capturedAt).toLocaleDateString('ko-KR')}</time></article>)}</div>:!error&&<p className="v6-public-message">아직 공개된 카드가 없어요.</p>}
   {!loading&&!error&&data?.total>0&&<nav className="v6-public-pager" aria-label="멍기록가 기록 페이지"><button type="button" disabled={!page} aria-label="이전 페이지" onClick={()=>setPage(p=>p-1)}><img src="/figma-v3/list-pager-prev.svg" alt=""/></button><span>{page+1} / {Math.max(1,Math.ceil(data.total/4))}</span><button type="button" disabled={!data.hasMore} aria-label="다음 페이지" onClick={()=>setPage(p=>p+1)}><img src="/figma-v3/list-pager-next.svg" alt=""/></button></nav>}
  </section>
 </div>;
}
export default function GoRecorder({id}){return <GoShell active="recorder"><Recorder id={id}/></GoShell>;}
