'use client';
import {useCallback,useEffect,useState} from 'react';
import GoShell,{useGoSession} from './GoShell.js';
import GoCard from './GoCard.js';
function Board(){
 const {member,openAccount}=useGoSession();
 const [posts,setPosts]=useState([]),[text,setText]=useState(''),[query,setQuery]=useState(''),[order,setOrder]=useState('newest'),[page,setPage]=useState(0),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{
 const params=new URLSearchParams({q:query,order,page:String(page),limit:'4'});
 const response=await fetch('/api/go/cards?'+params,{cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error||'도감을 불러오지 못했어요.');
 setPosts(data.cards||[]);setTotal(data.total||0);
 }catch(e){setError(e.message);}finally{setLoading(false);}},[query,order,page,member?.id]);
 useEffect(()=>{load();},[load]);
 const maxPage=Math.max(1,Math.ceil(total/4));
 return <div className="v3-community-list">
  <form className="v3-search" onSubmit={e=>{e.preventDefault();setPage(0);setQuery(text.trim());}}><input aria-label="게시물 검색" value={text} maxLength={80} onChange={e=>setText(e.target.value)} placeholder="제목·작성자·강아지 이름"/><button type="submit">검색</button></form>
  <div className="v3-board-sort"><select aria-label="등록 순서" value={order} onChange={e=>{setPage(0);setOrder(e.target.value);}}><option value="newest">등록 순서 | 최신순</option><option value="oldest">등록 순서 | 오래된순</option></select><span>전체 게시물 {total}</span></div>
  {error&&<p className="v3-error" role="alert">{error}</p>}
  {loading?<p className="v3-status">모두의 도감을 불러오고 있어요.</p>:posts.length?<div className="v3-community-grid">{posts.map(card=><article className="v3-community-item" key={card.id}><GoCard card={card} member={member} onLogin={openAccount} compact linkToPost onDelete={load}/><div className="v3-community-author">{card.nickname} 멍기록가</div><time>{card.capturedAt?new Date(card.capturedAt).toLocaleDateString('ko-KR'):''}</time></article>)}</div>:<p className="v3-status">아직 공개된 카드가 없어요.</p>}
  <div className="v3-pager"><button disabled={page===0||loading} onClick={()=>setPage(x=>x-1)} aria-label="이전 페이지">〈</button><span>{page+1} / {maxPage}</span><button disabled={page+1>=maxPage||loading} onClick={()=>setPage(x=>x+1)} aria-label="다음 페이지">〉</button></div>
 </div>;
}
export default function GoBoard(){return <GoShell active="community"><Board/></GoShell>;}
