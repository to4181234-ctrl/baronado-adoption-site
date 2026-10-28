'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import GoCard from './GoCard.js';
import GoLoading from './GoLoading.js';
export default function GoDogRecords({dog}){
 const [page,setPage]=useState(0),[cards,setCards]=useState([]),[total,setTotal]=useState(0),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');fetch(`/api/go/cards?dog=${dog.id}&limit=4&page=${page}&order=newest`,{cache:'no-store',signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);setCards(previous=>page?[...previous,...data.cards.filter(card=>!previous.some(existing=>existing.id===card.id))]:data.cards);setTotal(data.total);setMore(data.hasMore);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[dog.id,page,retry]);
 return <section className="go-dog-records" aria-labelledby="go-dog-records-title"><div className="go-section-title"><h2 id="go-dog-records-title">멍기록가들이 만난 {dog.name}</h2>{total>0&&<span>{total}개의 기록</span>}</div><p>멍기록가들의 시선으로 담은 {dog.name}의 순간들이에요.</p><div className="go-board-cards">{cards.map(card=><GoCard key={card.id} card={card} compact showTitle previewStats linkToPost/>)}</div>{loading&&<GoLoading compact label="멍멍이의 기록을 불러오고 있어요."/>}{error&&<p className="go-error" role="status">{error} <button type="button" className="go-text-button" onClick={()=>setRetry(value=>value+1)}>다시 보기</button></p>}{!loading&&!error&&!cards.length&&<p className="go-empty">{dog.adopted?'아직 공개된 카드가 없어요.':'아직 공개된 카드가 없어요. 첫 만남을 기록해보세요.'}</p>}{more&&!loading&&!error&&<button className="go-more" onClick={()=>setPage(p=>p+1)}>기록 더 보기</button>}<Link className="go-dog-record-link" href={`/go/${dog.id}`}>{dog.name}의 멍멍GO! 도감 보기 →</Link></section>;
}
