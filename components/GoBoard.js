'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import GoShell,{useGoSession} from './GoShell.js';
import GoCard from './GoCard.js';

const STORAGE_KEY='baronado:go:public-board:v6';
const PAGE_SIZE=4;
function restoreBoard(){
 try{const saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'{}');return {text:String(saved.text||'').slice(0,80),query:String(saved.query||'').slice(0,80),order:saved.order==='oldest'?'oldest':'newest',page:Number.isInteger(saved.page)&&saved.page>=0&&saved.page<=1000?saved.page:0,scroll:Number(saved.scroll)||0};}catch{return {text:'',query:'',order:'newest',page:0,scroll:0};}
}
function Board(){
 const {member}=useGoSession();
 const [state,setState]=useState({text:'',query:'',order:'newest',page:0,scroll:0});
 const [initialized,setInitialized]=useState(false),[posts,setPosts]=useState([]),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const requestRef=useRef(0),restoreScroll=useRef(null);
 useEffect(()=>{const saved=restoreBoard();restoreScroll.current=saved.scroll;setState(saved);setInitialized(true);},[]);
 const {text,query,order,page}=state;
 const load=useCallback(async(signal,requestId)=>{
  setLoading(true);setError('');
  try{
   const params=new URLSearchParams({q:query.trim(),order,page:String(page),limit:String(PAGE_SIZE)});
   const response=await fetch('/api/go/cards?'+params,{cache:'no-store',signal});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'도감을 불러오지 못했어요.');
   if(signal.aborted||requestId!==requestRef.current)return;
   setPosts(Array.isArray(data.cards)?data.cards:[]);setTotal(Math.max(0,Number(data.total)||0));
  }catch(e){if(!signal.aborted&&requestId===requestRef.current){setError(e.message||'도감을 불러오지 못했어요.');setPosts([]);}}
  finally{if(!signal.aborted&&requestId===requestRef.current)setLoading(false);}
 },[query,order,page,member?.id]);
 useEffect(()=>{if(!initialized)return;const controller=new AbortController();const id=++requestRef.current;load(controller.signal,id);return()=>controller.abort();},[initialized,load]);
 useEffect(()=>{if(!initialized)return;try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify({...state,scroll:0}));}catch{}},[state,initialized]);
 useEffect(()=>{if(loading||!initialized||restoreScroll.current===null)return;const y=restoreScroll.current;restoreScroll.current=null;if(y>0)window.scrollTo({top:y,behavior:'instant'});},[loading,initialized]);
 const maxPage=Math.max(1,Math.ceil(total/PAGE_SIZE));
 useEffect(()=>{if(initialized&&!loading&&page>=maxPage&&page>0)setState(s=>({...s,page:maxPage-1}));},[initialized,loading,page,maxPage]);
 function rememberPosition(){try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify({...state,scroll:window.scrollY}));}catch{}}
 return <section className="v6-public-board" aria-label="모두의 도감 게시물">
  <form className="v6-public-search" role="search" onSubmit={e=>{e.preventDefault();restoreScroll.current=null;setState(s=>({...s,query:s.text.trim(),page:0}));}}>
   <input aria-label="게시물 검색" value={text} maxLength={80} onChange={e=>setState(s=>({...s,text:e.target.value}))} placeholder="제목·작성자·강아지 이름"/>
   <button type="submit">검색</button>
  </form>
  <div className="v6-public-toolbar"><label>등록 순서ㅣ <select aria-label="등록 순서" value={order} onChange={e=>{restoreScroll.current=null;setState(s=>({...s,order:e.target.value,page:0}));}}><option value="newest">최신순</option><option value="oldest">오래된순</option></select></label><span aria-live="polite">{query?'검색 결과':'전체 게시물'} {total}건</span></div>
  {error&&<p className="v6-public-message" role="alert">{error} <button type="button" onClick={()=>{const controller=new AbortController();load(controller.signal,++requestRef.current);}}>다시 시도</button></p>}
  {loading?<p className="v6-public-message" role="status">모두의 도감을 불러오고 있어요.</p>:!error&&posts.length?<div className="v6-public-grid">{posts.map(card=><article className="v6-public-item" key={card.id} onClickCapture={e=>{if(e.target.closest('a[href]'))rememberPosition();}}>
    <GoCard card={card} member={member} compact linkToPost/>
    {card.ownerId?<Link href={'/go/recorders/'+card.ownerId} onClick={rememberPosition} className="v6-public-author">{card.nickname} 멍기록가</Link>:<span className="v6-public-author">{card.nickname} 멍기록가</span>}
    <time dateTime={card.createdAt||card.capturedAt}>{(card.createdAt||card.capturedAt)?new Date(card.createdAt||card.capturedAt).toLocaleDateString('ko-KR'):''}</time>
   </article>)}</div>:!error&&<div className="v6-public-message" role="status"><p>{query?'검색 결과가 없어요.':'아직 공개된 카드가 없어요.'}</p>{query&&<button type="button" onClick={()=>setState(s=>({...s,query:'',text:'',page:0}))}>검색어 지우기</button>}</div>}
  {!loading&&!error&&total>0&&<nav className="v6-public-pager" aria-label="게시물 페이지"><button type="button" disabled={page===0} onClick={()=>setState(s=>({...s,page:s.page-1}))} aria-label="이전 페이지"><img src="/figma-v3/list-pager-prev.svg" alt=""/></button><span>{page+1} / {maxPage}</span><button type="button" disabled={page+1>=maxPage} onClick={()=>setState(s=>({...s,page:s.page+1}))} aria-label="다음 페이지"><img src="/figma-v3/list-pager-next.svg" alt=""/></button></nav>}
 </section>;
}
export default function GoBoard(){return <GoShell active="community"><Board/></GoShell>;}
