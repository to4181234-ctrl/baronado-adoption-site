'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import GoShell,{useGoSession} from './GoShell.js';
import GoCard from './GoCard.js';
import GoCardExport from './GoCardExport.js';
function Post({id}){
 const {member,ready,openAccount}=useGoSession(),router=useRouter();
 const [card,setCard]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[exporting,setExporting]=useState(false);
 useEffect(()=>{if(!ready)return;let active=true;setLoading(true);
 fetch('/api/go/cards/'+id,{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'카드를 찾지 못했어요.');if(active)setCard(d.card);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[id,ready,member?.id]);
 return <article className="v3-post-detail">
  <Link className="v3-back" href="/go/community">‹ 모두의 도감</Link>
  {error&&<p className="v3-error">{error}</p>}
  {loading&&<p className="v3-status">카드를 불러오는 중이에요.</p>}
  {card&&<><h1>{card.title||card.dogName+'의 하루'}</h1><div className="v3-post-sparkle" aria-hidden="true">✦</div>
   <div className="v3-post-card"><GoCard key={card.id} card={card} member={member} onLogin={openAccount} onUpdated={setCard} onDelete={()=>router.push('/go/community')}/></div>
   <div className="v3-post-author"><Link href={card.ownerId?'/go/recorders/'+card.ownerId:'/go/community'}>{card.nickname} 멍기록가</Link><time>{card.capturedAt?new Date(card.capturedAt).toLocaleDateString('ko-KR'):''}</time></div>
   <div className="v3-post-primary-actions"><button onClick={()=>setExporting(true)}>이미지 저장·공유</button></div>
   <Link href={'/dogs/'+card.dogId} className="v3-post-link">{card.dogName} 소개 보기</Link>
   {exporting&&<GoCardExport card={card} onClose={()=>setExporting(false)}/>}
  </>}
 </article>;
}
export default function GoPost({id}){return <GoShell active="community"><Post id={id}/></GoShell>}
