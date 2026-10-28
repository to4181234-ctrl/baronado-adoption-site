'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GoShell,{useGoSession} from './GoShell.js';
import GoCard from './GoCard.js';
import GoLoading from './GoLoading.js';
function Post({id}){
 const {member,ready,openAccount}=useGoSession();const router=useRouter();const [card,setCard]=useState(null),[error,setError]=useState('');
 useEffect(()=>{if(!ready)return;setError('');fetch(`/api/go/cards/${id}`,{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);setCard(data.card);}).catch(e=>setError(e.message));},[id,member,ready]);
 return <><Link className="go-home" href="/go/community">← 게시판 목록</Link>{error?<p className="go-error">{error}</p>:card?<div className="go-post-detail"><GoCard key={`${card.id}-${member?.id||'guest'}`} card={card} member={member} onLogin={openAccount} onUpdated={setCard} onDelete={()=>router.push('/go/community')}/><Link className="go-dog-link" href={`/dogs/${card.dogId}`}><span><small>이 멍멍이가 궁금하다면</small><strong>{card.dogName} 소개 보기</strong></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></Link></div>:<GoLoading mode="bounce"/>}</>;
}
export default function GoPost({id}){return <GoShell active="community" title="모두의 멍멍 도감" description="멍기록가님의 수집 기록을 함께 나눠보세요"><Post id={id}/></GoShell>;}
