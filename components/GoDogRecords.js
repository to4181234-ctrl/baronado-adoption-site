'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

// Figma 173:11010: show the newest two public photos, not collectible-card faces.
export default function GoDogRecords({dog}){
 const [cards,setCards]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();setLoading(true);setError('');
  fetch(`/api/go/cards?dog=${encodeURIComponent(dog.id)}&limit=2&page=0&order=newest`,{cache:'no-store',signal:controller.signal})
   .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);setCards((data.cards||[]).slice(0,2));})
   .catch(e=>{if(e.name!=='AbortError')setError(e.message);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[dog.id,retry]);
 return <section className="go-dog-records v3-figma-records" aria-labelledby="go-dog-records-title">
  <h2 id="go-dog-records-title">멍기록가들이 만난 {dog.name}</h2>
  <div className="v3-record-preview-grid">{cards.map(card=><Link className="v3-record-preview" href={'/go/posts/'+card.id} key={card.id}>
    <img src={card.imageUrl} alt={`${card.dogName||dog.name}의 멍기록 사진`} loading="lazy"/>
    <strong>{card.title||`${dog.name}의 순간`}</strong>
    <small>{card.nickname||'익명의'} 멍기록가</small>
  </Link>)}</div>
  {loading&&<p className="go-empty" role="status">멍기록을 불러오는 중이에요.</p>}
  {error&&<p className="go-error" role="status">{error} <button type="button" className="go-text-button" onClick={()=>setRetry(x=>x+1)}>다시 보기</button></p>}
  {!loading&&!error&&!cards.length&&<p className="go-empty">아직 공개된 멍기록이 없어요.</p>}
  <Link className="go-dog-record-link" href="/go/community">모두의 도감 보러가기</Link>
 </section>;
}
