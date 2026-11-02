'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard.js';
import SiteHeader from '../../../components/SiteHeader.js';
import GoReportReview from '../../../components/GoReportReview.js';
import GoAdminStats from '../../../components/GoAdminStats.js';
import {REJECTION_REASONS} from '../../../lib/goShared.js';
const date=value=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)).replace(/\. /g,'.').replace(/\.$/,''):'';
function ReviewPage(){
 const [dogs,setDogs]=useState([]),[dogId,setDogId]=useState(''),[order,setOrder]=useState('newest'),[view,setView]=useState('all');
 const [cards,setCards]=useState([]),[page,setPage]=useState(0),[total,setTotal]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [text,setText]=useState(''),[query,setQuery]=useState(''),[selecting,setSelecting]=useState(false),[selected,setSelected]=useState([]),[activeId,setActiveId]=useState(null),[showStats,setShowStats]=useState(false),[notice,setNotice]=useState('');
 const [action,setAction]=useState(null),[reason,setReason]=useState(''),[note,setNote]=useState('');
 const requestId=useRef(0),mutating=useRef(false);
 const active=cards.find(card=>card.id===activeId)||null;
 const pages=Math.max(1,Math.ceil(total/5));
 const load=useCallback(async()=>{
  const id=++requestId.current;setLoading(true);setError('');
  try{const params=new URLSearchParams({status:view,page:String(page),q:query,order,dogId});const r=await fetch('/api/admin/go/cards?'+params,{cache:'no-store'});const d=await r.json();if(id!==requestId.current)return;if(!r.ok)throw Error(d.error||'카드를 불러오지 못했어요.');if(page>0&&!d.cards.length){setPage(0);return;}setCards(d.cards);setTotal(d.total);}catch(e){if(id===requestId.current)setError(e.message);}finally{if(id===requestId.current)setLoading(false);}
 },[view,page,query,order,dogId]);
 useEffect(()=>{load();return()=>{requestId.current++;};},[load]);
 useEffect(()=>{const ctl=new AbortController();fetch('/api/admin/go/dogs',{cache:'no-store',signal:ctl.signal}).then(r=>r.json()).then(d=>{if(!ctl.signal.aborted)setDogs(d.dogs||[]);}).catch(()=>{});return()=>ctl.abort();},[]);
 function resetFilters(change){setPage(0);setSelected([]);setSelecting(false);setActiveId(null);setNotice('');change();}
 function toggle(id){if(!selected.includes(id)&&selected.length>=50){setNotice('한 번에 최대 50개까지 선택할 수 있어요.');return;}setSelected(values=>values.includes(id)?values.filter(v=>v!==id):[...values,id]);}
 function openCard(card){setActiveId(card.id);setAction(null);setError('');window.scrollTo({top:0});}
 async function mutate(method,body,message){
  if(mutating.current)return;mutating.current=true;setBusy(true);setError('');
  try{const r=await fetch('/api/admin/go/cards',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'저장하지 못했어요.');setAction(null);setSelected([]);setSelecting(false);if(method==='DELETE')setActiveId(null);setNotice(message+(d.partial?' 일부 카드의 상태가 변경되어 삭제하지 못했어요. 목록을 다시 확인해주세요.':'')+(d.cleanupPending?' 사진 파일 정리가 지연되고 있어요.':''));await load();}catch(e){setError(e.message);}finally{mutating.current=false;setBusy(false);}
 }
 function removeSelected(){if(selected.length&&window.confirm(`선택한 카드 ${selected.length}개를 완전히 삭제할까요? 삭제 후에는 복구할 수 없어요.`))mutate('DELETE',{ids:selected,status:view},'선택한 카드를 삭제했어요.');}
 return <main className="site-shell v3-site v10-admin-cards"><SiteHeader/><section className="v10-admin-content">
  {active?<button className="v10-admin-back" onClick={()=>{setActiveId(null);setAction(null);setError('');}}>‹ 카드 목록</button>:showStats?<button className="v10-admin-back" onClick={()=>setShowStats(false)}>‹ 카드 목록</button>:<Link className="v10-admin-back" href="/admin">‹ 관리 메뉴</Link>}
  <header className="v10-admin-heading"><h1>{active?'카드 게시물 상세':showStats?'카드 게시물 통계':'카드 게시물 관리'}</h1><p>{active?'사진·제목·신고 내용을 확인하고 처리해요.':showStats?'기간별 게시물과 좋아요를 확인해요.':'제목·작성자·강아지 이름으로 카드를 찾아요.'}</p></header>
  {error&&<p role="alert" className="v3-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {showStats?<GoAdminStats/>:active?<article className="v10-admin-detail">
   <img className="v10-admin-detail-photo" src={active.imageUrl} alt={active.dogName+' 촬영 사진'}/><h2>{active.title}</h2>
   <dl>{[['작성자',active.nickname],['강아지',active.dogName],['등록일',date(active.createdAt)],['좋아요',active.likeCount+'개'],['노출 상태',active.status==='approved'?'게시 중':'관리자 숨김']].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   <h3>발급된 카드 정보</h3><dl><div><dt>속성</dt><dd>{active.battle?.element||'정보 없음'}</dd></div><div><dt>능력치</dt><dd>파워 {active.battle?.power??'—'} · 애교 {active.battle?.charm??'—'}</dd></div></dl><p className="v10-admin-note">발급 당시 사진·능력치·속성을 유지해요. 관리자가 다시 발급하지 않아요.</p>
   <h3>접수된 신고</h3>{active.reportCount>0?<GoReportReview cardId={active.id} count={active.reportCount}/>:<p className="v10-admin-note">접수된 신고가 없어요.</p>}
   <div className="v10-admin-detail-actions"><button disabled={busy} onClick={()=>{if(active.status==='approved'){setAction('hide');setReason('');setNote('');}else mutate('PATCH',{id:active.id,status:'approved'},'숨김을 해제했어요.');}}>{active.status==='approved'?'공개 목록에서 숨기기':'숨김 해제'}</button><button className="is-danger" disabled={busy} onClick={()=>{if(window.confirm('카드를 완전히 삭제할까요? 사진·좋아요·신고 기록이 삭제되고 복구할 수 없어요.'))mutate('DELETE',{id:active.id},'카드를 삭제했어요.');}}>카드 삭제</button></div><p className="v10-admin-note">숨김은 카드 소유자의 보유 기록을 지우지 않아요.</p>
   {action==='hide'&&<form className="v10-admin-hide" onSubmit={e=>{e.preventDefault();mutate('PATCH',{id:active.id,status:'rejected',reason,note},'공개 목록에서 숨겼어요.');}}><label>숨김 사유<select required value={reason} onChange={e=>setReason(e.target.value)}><option value="">선택해주세요</option>{Object.entries(REJECTION_REASONS).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>{reason==='other'&&<label>기타 사유<textarea required maxLength={300} value={note} onChange={e=>setNote(e.target.value)}/></label>}<div><button type="button" disabled={busy} onClick={()=>setAction(null)}>취소</button><button disabled={busy||!reason||reason==='other'&&!note.trim()}>숨김 확정</button></div></form>}
  </article>:<>
   <form className="v10-admin-search" onSubmit={e=>{e.preventDefault();resetFilters(()=>setQuery(text.trim()));}}><input aria-label="관리 게시물 검색" maxLength={80} placeholder="제목·작성자·강아지 이름" value={text} onChange={e=>setText(e.target.value)}/><button>검색</button></form>
   <div className="v10-admin-filters"><select aria-label="강아지 필터" value={dogId} onChange={e=>resetFilters(()=>setDogId(e.target.value))}><option value="">강아지 전체</option>{dogs.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select><select aria-label="등록 순서" value={order} onChange={e=>resetFilters(()=>setOrder(e.target.value))}><option value="newest">최신순</option><option value="oldest">오래된순</option></select></div>
   <div className="v10-admin-tabs" role="group" aria-label="게시물 관리 메뉴">{[['all','전체'],['approved','게시 중'],['rejected','관리자 숨김']].map(([key,label])=><button className={view===key?'active':''} key={key} aria-pressed={view===key} onClick={()=>resetFilters(()=>setView(key))}>{label}</button>)}</div>
   <div className="v10-admin-card-total"><strong>전체 {total}건</strong><button disabled={busy||loading} onClick={()=>{setSelecting(v=>!v);setSelected([]);}}>{selecting?'선택 취소':'카드 선택'}</button></div>
   {selecting&&<div className="v10-admin-bulk"><label><input type="checkbox" checked={cards.length>0&&cards.every(c=>selected.includes(c.id))} onChange={e=>setSelected(e.target.checked?[...new Set([...selected,...cards.map(c=>c.id)])].slice(0,50):selected.filter(id=>!cards.some(c=>c.id===id)))}/> 현재 페이지 전체 선택</label><button disabled={busy||!selected.length} onClick={removeSelected}>선택 {selected.length}개 삭제</button></div>}
   {loading?<p role="status">카드를 불러오는 중이에요.</p>:!cards.length?<p className="v10-admin-note">게시물이 없어요.</p>:<div className="v10-admin-card-list">{cards.map(card=><article key={card.id}>{selecting&&<input type="checkbox" checked={selected.includes(card.id)} onChange={()=>toggle(card.id)} aria-label={card.title+' 삭제 대상으로 선택'}/>}<button className="v10-admin-card-row" onClick={()=>selecting?toggle(card.id):openCard(card)}><img src={card.imageUrl} alt=""/><span><strong>{card.title}</strong><small>{card.dogName} · {card.nickname}</small><small>{date(card.createdAt)} · 좋아요 {card.likeCount}</small></span><b aria-hidden="true">›</b></button></article>)}</div>}
   <div className="v10-admin-pager"><button disabled={busy||loading||page===0} onClick={()=>setPage(v=>v-1)}>이전</button><span>{page+1} / {pages}</span><button disabled={busy||loading||page+1>=pages} onClick={()=>setPage(v=>v+1)}>다음</button></div><button className="v10-admin-stats-link" onClick={()=>setShowStats(true)}>카드 통계 보기</button><p className="v10-admin-note">모든 카드는 저장 즉시 공개돼요. 작성자의 공개·비공개 선택은 없고, 관리자는 숨김 또는 삭제로 처리해요.</p>
  </>}
 </section></main>;
}
export default function Page(){return <AdminGuard><ReviewPage/></AdminGuard>}
