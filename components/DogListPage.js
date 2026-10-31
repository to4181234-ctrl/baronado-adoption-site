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
export default function DogListPage({title,category}){
 const resident=category==='resident';
 const [dogs,setDogs]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [filter,setFilter]=useState('all'),[order,setOrder]=useState('newest'),[page,setPage]=useState(0);
 useEffect(()=>{recordVisit(resident?'residents':'home');let active=true;fetchDogs(category).then(data=>{if(active)setDogs(data);}).catch(e=>{if(active)setError(e.message||'목록을 불러오지 못했어요.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[category,resident]);
 const shown=useMemo(()=>dogs.filter(d=>resident||filter==='all'||(filter==='adopted'?d.adopted:!d.adopted)).sort((a,b)=>{if(!resident&&filter==='all'&&a.adopted!==b.adopted)return Number(a.adopted)-Number(b.adopted);const t=String(a.created_at||'').localeCompare(String(b.created_at||''));return order==='oldest'?t:-t;}),[dogs,resident,filter,order]);
 const count=Math.max(1,Math.ceil(shown.length/PAGE_SIZE)),current=Math.min(page,count-1);
 return <main className="site-shell v3-site v3-list-site">
  <SiteHeader/>
  <section className="v3-hero"><div className="v3-hero-logo"><img src="/baronado-logo.png" alt="" className="v3-hero-mark"/><span>바로나도</span></div><div className="v3-hero-dots" aria-hidden="true">● ● ●</div></section>
  <section className="v3-content v3-dog-list">
    <h1>{title}</h1>
    <div className="v3-list-controls">
     {!resident&&<label>입양 상태 <select value={filter} aria-label="입양 상태" onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="all">전체보기</option><option value="available">입양 전</option><option value="adopted">입양 완료</option></select></label>}
     <label>등록 순서 <select value={order} aria-label="등록 순서" onChange={e=>{setOrder(e.target.value);setPage(0);}}><option value="newest">최신순</option><option value="oldest">오래된순</option></select></label>
    </div>
    <p className="v3-muted v3-count">전체 {shown.length}마리</p>
    {loading&&<p className="v3-status" role="status">강아지들을 불러오는 중이에요.</p>}
    {error&&<p className="v3-error" role="alert">{error}</p>}
    {!loading&&!shown.length&&<p className="v3-status">해당하는 강아지가 없어요.</p>}
    <div className="v3-dogs-grid">{shown.slice(current*PAGE_SIZE,(current+1)*PAGE_SIZE).map(dog=><Link className="v3-dog-tile" key={dog.id} href={'/dogs/'+dog.id}><div className="v3-dog-image">{dog.images?.[0]?<img src={dog.images[0]} alt={dog.name} loading="lazy"/>:<span className="v3-empty-photo">멍멍!</span>}{dog.adopted&&<span className="v3-adopted">입양 완료</span>}</div><strong>{dog.name}</strong><small>{dog.gender} │ 중성화 {dog.neutered?'O':'X'} │ {getAgeInfo(dog).listDisplay}</small></Link>)}</div>
    <nav className="v3-pager" aria-label="목록 페이지"><button disabled={current===0} aria-label="이전 페이지" onClick={()=>setPage(current-1)}>〈</button><span>{current+1} / {count}</span><button disabled={current===count-1} aria-label="다음 페이지" onClick={()=>setPage(current+1)}>〉</button></nav>
  </section>
  <DogActions allowInquiry={!resident}/>
  {!resident&&<GoDiscovery dogs={dogs} dog={dogs[0]}/>}
 </main>;
}
