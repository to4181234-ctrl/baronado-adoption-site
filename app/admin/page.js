'use client';
import {Suspense,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {CATEGORY_ADOPTION,CATEGORY_RESIDENT,deleteDog,fetchDogs,normalizeCategory} from '../../lib/dogs';
import {isSupabaseConfigured} from '../../lib/supabaseClient';
import AdminGuard from '../../components/AdminGuard';
import SiteHeader from '../../components/SiteHeader';
import {getAgeInfo} from '../../lib/dogProfile';

function AdminContent(){
 const params=useSearchParams(),category=normalizeCategory(params.get('category'));
 const [dogs,setDogs]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [target,setTarget]=useState(null),[doneMessage,setDoneMessage]=useState('');
 const [input,setInput]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[order,setOrder]=useState('newest'),[page,setPage]=useState(0);
 function load(){
  if(!isSupabaseConfigured){setLoading(false);return;}
  setLoading(true);setError('');
  fetchDogs(category).then(setDogs).catch(e=>setError(e.message||'목록을 불러오지 못했어요.')).finally(()=>setLoading(false));
 }
 useEffect(()=>{load();setPage(0)},[category]);
 const filtered=useMemo(()=>dogs.filter(d=>(!query||d.name.toLocaleLowerCase('ko-KR').includes(query.toLocaleLowerCase('ko-KR')))&&(
  status==='all'||status==='draft'&&d.status==='draft'||status==='available'&&!d.adopted&&d.status!=='draft'||status==='adopted'&&d.adopted
 )).sort((a,b)=>order==='newest'?String(b.created_at||'').localeCompare(String(a.created_at||'')):String(a.created_at||'').localeCompare(String(b.created_at||''))),[dogs,query,status,order]);
 const maxPage=Math.max(1,Math.ceil(filtered.length/4)),currentPage=Math.min(page,maxPage-1),shown=filtered.slice(currentPage*4,currentPage*4+4);
 async function confirmDelete(){
  if(!target)return;
  try{await deleteDog(target.id);setDoneMessage('삭제가 완료되었습니다.');setTarget(null);load();}
  catch(e){setError(e.message);setTarget(null);}
 }
 return <main className="site-shell v3-site v3-admin-list-site">
  <SiteHeader/>
  <section className="v3-admin-list">
   <details className="v3-admin-chooser"><summary>‹ 관리 메뉴</summary><nav><Link href="/admin?category=adoption">가족을 찾아요</Link><Link href="/admin?category=resident">상주견 소개</Link><Link href="/admin/go">멍멍GO! 게시물 관리</Link><Link href="/admin/analytics">방문 통계</Link></nav></details>
   <header className="v3-admin-list-banner"><h1>{category===CATEGORY_RESIDENT?'상주견 소개 관리':'가족을 찾아요 관리'}</h1><p>사진·정보를 확인하고 등록하거나 수정해요.</p></header>
   <Link className="v3-admin-add" href={'/admin/new?category='+category}>+ 새 강아지 등록</Link>
   <form className="v3-admin-search" onSubmit={e=>{e.preventDefault();setPage(0);setQuery(input.trim())}}><input value={input} placeholder="강아지 이름 검색" aria-label="강아지 이름 검색" onChange={e=>setInput(e.target.value)}/><button type="submit">검색</button></form>
   <div className="v3-admin-status-tabs">{[['all','전체보기'],['available','입양 전'],['adopted','입양 완료'],['draft','임시 저장']].map(([key,label])=><button type="button" className={status===key?'active':''} key={key} onClick={()=>{setStatus(key);setPage(0)}}>{label}</button>)}</div>
   <div className="v3-admin-sort"><label>등록일 기준</label><select value={order} onChange={e=>{setOrder(e.target.value);setPage(0)}} aria-label="정렬"><option value="newest">최신순 ▾</option><option value="oldest">오래된순 ▾</option></select></div>
   <p className="v3-admin-total">전체 {filtered.length}마리</p>
   {error&&<p className="v3-error" role="alert">{error}</p>}
   {!isSupabaseConfigured&&<p className="v3-error">Supabase 환경변수를 확인해주세요.</p>}
   {loading?<p className="v3-status">강아지 목록을 불러오는 중이에요.</p>:shown.length?<div className="v3-admin-dogs">{shown.map(dog=><article className="v3-admin-dog" key={dog.id}>
    <div className="v3-admin-dog-info"><div className="v3-admin-photo">{dog.images?.[0]&&<img src={dog.images[0]} alt={dog.name+' 사진'}/>}</div><div className="v3-admin-dog-text"><div className="v3-admin-dog-name"><strong>{dog.name}</strong><small className={dog.adopted?'adopted':''}>{dog.adopted?'입양 완료':'입양 전'}</small></div><p className="v3-admin-date">등록 {dog.created_at?new Date(dog.created_at).toLocaleDateString('ko-KR'):'정보 없음'}</p><p>{dog.gender} ㅣ 중성화 {dog.neutered?'O':'X'} ㅣ {getAgeInfo(dog).listDisplay}</p></div></div>
    <div className="v3-admin-dog-actions"><Link href={'/dogs/'+dog.id}>상세 보기</Link><Link href={'/admin/edit/'+dog.id}>수정</Link><button type="button" onClick={()=>setTarget(dog)}>삭제</button></div>
   </article>)}</div>:<p className="v3-status">표시할 강아지가 없어요.</p>}
   <nav className="v3-admin-pages" aria-label="관리자 목록 페이지"><button disabled={currentPage===0||loading} onClick={()=>setPage(p=>Math.max(0,p-1))}>이전</button><span>{currentPage+1} / {maxPage}</span><button disabled={currentPage+1>=maxPage||loading} onClick={()=>setPage(p=>p+1)}>다음</button></nav>
   <p className="v3-admin-caption">전체보기는 입양 전·입양 완료 상태의 카드가 포함됩니다.</p>
  </section>
  {target&&<div className="image-modal"><div className="modal-card"><p>{target.name}을(를) 삭제하시겠습니까?</p><div className="modal-actions"><button className="btn danger" onClick={confirmDelete}>삭제</button><button className="btn secondary" onClick={()=>setTarget(null)}>취소</button></div></div></div>}
  {doneMessage&&<div className="image-modal"><div className="modal-card"><p>{doneMessage}</p><button className="btn" onClick={()=>setDoneMessage('')}>확인</button></div></div>}
 </main>;
}
export default function AdminPage(){return <Suspense fallback={<p className="v3-status">관리 화면을 불러오고 있어요.</p>}><AdminGuard><AdminContent/></AdminGuard></Suspense>}
