'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard.js';
import SiteHeader from '../../../components/SiteHeader.js';
const PAGE_SIZE=5;
const STATUS=[['all','전체'],['approved','게시 중'],['hidden','관리자 숨김']];
function CardManager(){
 const [cards,setCards]=useState([]),[dogs,setDogs]=useState([]),[total,setTotal]=useState(0),[page,setPage]=useState(0),[status,setStatus]=useState('all'),[order,setOrder]=useState('newest'),[dog,setDog]=useState('all'),[text,setText]=useState(''),[query,setQuery]=useState('');
 const [selecting,setSelecting]=useState(false),[selected,setSelected]=useState({}),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{const p=new URLSearchParams({page:String(page),status,order,dog,q:query});const r=await fetch('/api/admin/go/overview?'+p,{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'카드를 불러오지 못했어요.');setCards(data.cards||[]);setTotal(data.total||0);setDogs(data.dogs||[])}catch(e){setError(e.message)}finally{setLoading(false)}},[page,status,order,dog,query]);
 useEffect(()=>{load()},[load]);
 function changeFilter(key,value){if(key==='status')setStatus(value);if(key==='order')setOrder(value);if(key==='dog')setDog(value);setPage(0);setSelected({});setNotice('')}
 function search(e){e.preventDefault();setPage(0);setQuery(text.trim());setSelected({});setNotice('')}
 function toggle(id,cardStatus){setSelected(prev=>{const next={...prev};if(next[id])delete next[id];else if(Object.keys(next).length<50)next[id]=cardStatus;return next})}
 function selectPage(){setSelected(prev=>{const next={...prev};for(const c of cards){if(!next[c.id]&&Object.keys(next).length<50)next[c.id]=c.status}return next})}
 const selectedCount=Object.keys(selected).length;
 async function remove(){if(!selectedCount||busy)return;if(!window.confirm(`선택한 ${selectedCount}개 카드를 완전히 삭제할까요? 연결된 사진·좋아요·신고도 삭제되며 복원할 수 없습니다.`))return;setBusy(true);setError('');
  try{const res=await fetch('/api/admin/go/bulk',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:Object.keys(selected),statusById:selected})});const data=await res.json();if(!res.ok)throw Error(data.error||'삭제하지 못했어요.');setNotice(`${data.deletedIds?.length||0}개 카드를 삭제했어요.${data.cleanupPending?' 사진 파일 정리가 지연 중이에요.':''}`);setSelected({});setSelecting(false);await load()}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main className="site-shell v3-site v3-admin-cards-site"><SiteHeader/><section className="v3-admin-cards">
  <Link href="/admin" className="v3-back">‹ 관리 메뉴</Link><h1>카드 게시물 관리</h1><p className="v3-admin-cards-subtitle">제목·작성자·강아지 이름으로 카드를 찾아요.</p><nav className="v3-admin-card-menu"><Link href="/admin/go/reports">신고 확인</Link><Link href="/admin/go/stats">카드 통계</Link></nav>
  <form className="v3-admin-card-search" onSubmit={search}><input aria-label="관리 카드 검색" placeholder="제목·작성자·강아지 이름" value={text} maxLength={80} onChange={e=>setText(e.target.value)}/><button>검색</button></form>
  <div className="v3-admin-card-filters"><select aria-label="강아지 선택" value={dog} onChange={e=>changeFilter('dog',e.target.value)}><option value="all">모든 강아지</option>{dogs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><select aria-label="등록 순서" value={order} onChange={e=>changeFilter('order',e.target.value)}><option value="newest">최신순</option><option value="oldest">오래된순</option></select></div><div className="v3-admin-card-status-tabs">{STATUS.map(([key,label])=><button type="button" key={key} aria-pressed={status===key} onClick={()=>changeFilter('status',key)}>{label}</button>)}</div>
  <div className="v3-admin-card-toolbar"><span>전체 {total}개</span><button type="button" onClick={()=>{setSelecting(s=>!s);setSelected({})}}>{selecting?'취소':'카드 선택'}</button></div>
  {selecting&&<div className="v3-admin-card-selection"><strong>{selectedCount}개 선택</strong><button disabled={busy||!cards.length} onClick={selectPage}>현재 페이지 전체 선택</button><button disabled={!selectedCount} onClick={()=>setSelected({})}>전체 선택 해제</button><button disabled={!selectedCount||busy} onClick={remove}>선택 {selectedCount}개 삭제</button></div>}
  {error&&<p className="v3-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {loading?<p>카드를 불러오고 있어요.</p>:cards.length===0?<p>조건에 맞는 게시물이 없어요.</p>:<div className="v3-admin-card-list">{cards.map(card=><article className="v3-admin-card-row" key={card.id}>{selecting&&<label><input type="checkbox" checked={Boolean(selected[card.id])} onChange={()=>toggle(card.id,card.status)} disabled={busy}/></label>}<img src={card.imageUrl} alt={card.dogName+' 사진'}/><div><Link href={'/admin/go/card/'+card.id}><strong>{card.title||'제목 없음'}</strong></Link><p>{card.dogName} · {card.nickname}</p><small>{new Date(card.createdAt).toLocaleDateString('ko-KR')} · {card.status==='approved'?'게시 중':'관리자 숨김'}</small></div></article>)}</div>}
  <nav className="v3-admin-pages" aria-label="관리 카드 페이지"><button disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page+1} / {Math.max(1,Math.ceil(total/PAGE_SIZE))}</span><button disabled={(page+1)*PAGE_SIZE>=total||loading} onClick={()=>setPage(p=>p+1)}>다음</button></nav>
 </section></main>
}
export default function AdminGoPage(){return <AdminGuard><CardManager/></AdminGuard>}
