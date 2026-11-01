'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {fetchDogs} from '../lib/dogs';
import {getAgeInfo} from '../lib/dogProfile';
import {recordVisit} from '../lib/siteAnalytics';
import SiteHeader from './SiteHeader';
import DogActions from './DogActions';
import GoDiscovery from './GoDiscovery';
import SiteBanner from './SiteBanner';
const PAGE_SIZE=4;
const ORDER_CHOICES=[['newest','최신순'],['oldest','오래된순']];
const ADOPTION_CHOICES=[['all','전체보기'],['available','입양 전'],['adopted','입양 완료']];
export default function DogListPage({title,category}){
 const resident=category==='resident';
 const [dogs,setDogs]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [filter,setFilter]=useState('all'),[order,setOrder]=useState('newest'),[page,setPage]=useState(0),[sheet,setSheet]=useState(null);
 const restoreY=useRef(null);
 const restoreKey='baronado-dog-list-return:'+category;
 function openSheet(name){
  if(sheet)return;
  window.history.pushState({...window.history.state,v3DogListSheet:true},'');
  setSheet(name);
 }
 function closeSheet(){setSheet(null);if(window.history.state?.v3DogListSheet)window.history.back();}
 useEffect(()=>{if(!sheet)return;const prev=document.body.style.overflow;document.body.style.overflow='hidden';const key=e=>{if(e.key==='Escape')closeSheet()};const back=()=>setSheet(null);window.addEventListener('keydown',key);window.addEventListener('popstate',back);return()=>{document.body.style.overflow=prev;window.removeEventListener('keydown',key);window.removeEventListener('popstate',back);}},[sheet]);
 useEffect(()=>{recordVisit(resident?'residents':'home');let active=true;fetchDogs(category).then(data=>{if(active)setDogs(data);}).catch(e=>{if(active)setError(e.message||'목록을 불러오지 못했어요.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[category,resident]);
 const shown=useMemo(()=>dogs.filter(d=>resident||filter==='all'||(filter==='adopted'?d.adopted:!d.adopted)).sort((a,b)=>{if(!resident&&filter==='all'&&a.adopted!==b.adopted)return Number(a.adopted)-Number(b.adopted);const t=String(a.created_at||'').localeCompare(String(b.created_at||''));return order==='oldest'?t:-t;}),[dogs,resident,filter,order]);
 const count=Math.max(1,Math.ceil(shown.length/PAGE_SIZE)),current=Math.min(page,count-1);
 // Figma 173:297: return from a detail page with filter, order, page and scroll intact.
 useEffect(()=>{
  try{
   const raw=sessionStorage.getItem(restoreKey);if(!raw)return;
   sessionStorage.removeItem(restoreKey);
   const saved=JSON.parse(raw);
   if(saved?.filter&&ADOPTION_CHOICES.some(([value])=>value===saved.filter))setFilter(saved.filter);
   if(saved?.order&&ORDER_CHOICES.some(([value])=>value===saved.order))setOrder(saved.order);
   if(Number.isInteger(saved?.page)&&saved.page>=0)setPage(saved.page);
   if(Number.isFinite(saved?.scrollY)&&saved.scrollY>=0)restoreY.current=saved.scrollY;
  }catch{}
 },[restoreKey]);
 useEffect(()=>{
  if(loading||restoreY.current===null)return;
  const y=restoreY.current;
  restoreY.current=null;
  const id=requestAnimationFrame(()=>window.scrollTo({top:y,left:0,behavior:'auto'}));
  return()=>cancelAnimationFrame(id);
 },[loading,current,filter,order,shown.length]);
 function rememberReturn(){
  try{sessionStorage.setItem(restoreKey,JSON.stringify({filter,order,page:current,scrollY:window.scrollY}));}catch{}
 }
 return <main className="site-shell v3-site v3-list-site">
  <SiteHeader/>
  <SiteBanner/>
  <section className="v3-content v3-dog-list">
    <h1>{title}</h1>
    <div className="v3-list-controls">
     {!resident&&<div className="v3-list-filter"><span>입양 상태</span><button type="button" onClick={()=>openSheet('adoption')} aria-haspopup="dialog" aria-label={'입양 상태 '+ADOPTION_CHOICES.find(x=>x[0]===filter)?.[1]}>{ADOPTION_CHOICES.find(x=>x[0]===filter)?.[1]}<span aria-hidden="true">⌄</span></button></div>}
     <div className="v3-list-filter"><span>등록 순서</span><button type="button" onClick={()=>openSheet('order')} aria-haspopup="dialog" aria-label={'등록 순서 '+ORDER_CHOICES.find(x=>x[0]===order)?.[1]}>{ORDER_CHOICES.find(x=>x[0]===order)?.[1]}<span aria-hidden="true">⌄</span></button></div>
    </div>
    <p className="v3-muted v3-count">전체 {shown.length}마리</p>
    {loading&&<p className="v3-status" role="status">강아지들을 불러오는 중이에요.</p>}
    {error&&<p className="v3-error" role="alert">{error}</p>}
    {!loading&&!shown.length&&<p className="v3-status">게시물 없음</p>}
    <div className="v3-dogs-grid">{shown.slice(current*PAGE_SIZE,(current+1)*PAGE_SIZE).map(dog=><Link className="v3-dog-tile" key={dog.id} href={'/dogs/'+dog.id} onClick={rememberReturn}><div className="v3-dog-image">{dog.images?.[0]?<img src={dog.images[0]} alt={dog.name} loading="lazy"/>:<span className="v3-empty-photo">멍멍!</span>}{dog.adopted&&<span className="v3-adopted">입양 완료</span>}</div><strong>{dog.name}</strong><small>{dog.gender} │ 중성화 {dog.neutered?'O':'X'} │ {getAgeInfo(dog).listDisplay}</small></Link>)}</div>
    {shown.length>0&&<nav className="v3-pager" aria-label="목록 페이지"><button disabled={current===0} aria-label="이전 페이지" onClick={()=>setPage(current-1)}>〈</button><span>{current+1} / {count}</span><button disabled={current===count-1} aria-label="다음 페이지" onClick={()=>setPage(current+1)}>〉</button></nav>}
  </section>
  {sheet&&<div className="v3-filter-backdrop" onClick={closeSheet} role="presentation"><section className="v3-filter-sheet" role="dialog" aria-modal="true" aria-label={sheet==='adoption'?'입양 상태 선택':'등록 순서 선택'} onClick={e=>e.stopPropagation()}><h2>{sheet==='adoption'?'입양 상태':'등록 순서'}</h2>{(sheet==='adoption'?ADOPTION_CHOICES:ORDER_CHOICES).map(([value,label])=><button type="button" key={value} className="v3-filter-option" aria-pressed={(sheet==='adoption'?filter:order)===value} onClick={()=>{if(sheet==='adoption')setFilter(value);else setOrder(value);setPage(0);closeSheet()}}>{label}{(sheet==='adoption'?filter:order)===value&&<span aria-hidden="true">✓</span>}</button>)}</section></div>}
  <DogActions allowInquiry={!resident}/>
  {!resident&&<GoDiscovery dogs={dogs} dog={dogs[0]}/>}
 </main>;
}
