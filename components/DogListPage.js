'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {fetchDogs} from '../lib/dogs';
import {getAgeInfo} from '../lib/dogProfile';
import {recordVisit} from '../lib/siteAnalytics';
import SiteHeader from './SiteHeader';
import DogActions from './DogActions';
import GoDiscovery from './GoDiscovery';
const PAGE_SIZE=4;
const ORDER_CHOICES=[['newest','최신순'],['oldest','오래된순']];
const ADOPTION_CHOICES=[['all','전체보기'],['available','입양 전'],['adopted','입양 완료']];
export default function DogListPage({title,category}){
 const resident=category==='resident';
 const [dogs,setDogs]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [filter,setFilter]=useState('all'),[order,setOrder]=useState('newest'),[page,setPage]=useState(0),[sheet,setSheet]=useState(null);
 useEffect(()=>{if(!sheet)return;const prev=document.body.style.overflow;document.body.style.overflow='hidden';const key=e=>{if(e.key==='Escape')setSheet(null)};const back=()=>setSheet(null);window.addEventListener('keydown',key);window.addEventListener('popstate',back);return()=>{document.body.style.overflow=prev;window.removeEventListener('keydown',key);window.removeEventListener('popstate',back);}},[sheet]);
 useEffect(()=>{recordVisit(resident?'residents':'home');let active=true;fetchDogs(category).then(data=>{if(active)setDogs(data);}).catch(e=>{if(active)setError(e.message||'목록을 불러오지 못했어요.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[category,resident]);
 const shown=useMemo(()=>dogs.filter(d=>resident||filter==='all'||(filter==='adopted'?d.adopted:!d.adopted)).sort((a,b)=>{if(!resident&&filter==='all'&&a.adopted!==b.adopted)return Number(a.adopted)-Number(b.adopted);const t=String(a.created_at||'').localeCompare(String(b.created_at||''));return order==='oldest'?t:-t;}),[dogs,resident,filter,order]);
 const count=Math.max(1,Math.ceil(shown.length/PAGE_SIZE)),current=Math.min(page,count-1);
 return <main className="site-shell v3-site v3-list-site">
  <SiteHeader/>
  <section className="v3-hero"><img className="v3-hero-original" src="/figma-v3/hero-logo.svg" alt="바로나도"/><div className="v3-hero-dots" aria-hidden="true"><span/><span/><span/></div></section>
  <section className="v3-content v3-dog-list">
    <h1>{title}</h1>
    <div className="v3-list-controls">
     {!resident&&<div className="v3-list-filter"><span>입양 상태</span><button type="button" onClick={()=>setSheet('adoption')} aria-haspopup="dialog" aria-label={'입양 상태 '+ADOPTION_CHOICES.find(x=>x[0]===filter)?.[1]}>{ADOPTION_CHOICES.find(x=>x[0]===filter)?.[1]}<span aria-hidden="true">⌄</span></button></div>}
     <div className="v3-list-filter"><span>등록 순서</span><button type="button" onClick={()=>setSheet('order')} aria-haspopup="dialog" aria-label={'등록 순서 '+ORDER_CHOICES.find(x=>x[0]===order)?.[1]}>{ORDER_CHOICES.find(x=>x[0]===order)?.[1]}<span aria-hidden="true">⌄</span></button></div>
    </div>
    <p className="v3-muted v3-count">전체 {shown.length}마리</p>
    {loading&&<p className="v3-status" role="status">강아지들을 불러오는 중이에요.</p>}
    {error&&<p className="v3-error" role="alert">{error}</p>}
    {!loading&&!shown.length&&<p className="v3-status">게시물 없음</p>}
    <div className="v3-dogs-grid">{shown.slice(current*PAGE_SIZE,(current+1)*PAGE_SIZE).map(dog=><Link className="v3-dog-tile" key={dog.id} href={'/dogs/'+dog.id}><div className="v3-dog-image">{dog.images?.[0]?<img src={dog.images[0]} alt={dog.name} loading="lazy"/>:<span className="v3-empty-photo">멍멍!</span>}{dog.adopted&&<span className="v3-adopted">입양 완료</span>}</div><strong>{dog.name}</strong><small>{dog.gender} │ 중성화 {dog.neutered?'O':'X'} │ {getAgeInfo(dog).listDisplay}</small></Link>)}</div>
    {shown.length>0&&<nav className="v3-pager" aria-label="목록 페이지"><button disabled={current===0} aria-label="이전 페이지" onClick={()=>setPage(current-1)}>〈</button><span>{current+1} / {count}</span><button disabled={current===count-1} aria-label="다음 페이지" onClick={()=>setPage(current+1)}>〉</button></nav>}
  </section>
  {sheet&&<div className="v3-filter-backdrop" onClick={()=>setSheet(null)} role="presentation"><section className="v3-filter-sheet" role="dialog" aria-modal="true" aria-label={sheet==='adoption'?'입양 상태 선택':'등록 순서 선택'} onClick={e=>e.stopPropagation()}><h2>{sheet==='adoption'?'입양 상태':'등록 순서'}</h2>{(sheet==='adoption'?ADOPTION_CHOICES:ORDER_CHOICES).map(([value,label])=><button type="button" key={value} className="v3-filter-option" aria-pressed={(sheet==='adoption'?filter:order)===value} onClick={()=>{if(sheet==='adoption')setFilter(value);else setOrder(value);setPage(0);setSheet(null)}}>{label}{(sheet==='adoption'?filter:order)===value&&<span aria-hidden="true">✓</span>}</button>)}</section></div>}
  <DogActions allowInquiry={!resident}/>
  {!resident&&<GoDiscovery dogs={dogs} dog={dogs[0]}/>}
 </main>;
}
