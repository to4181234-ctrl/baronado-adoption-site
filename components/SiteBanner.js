'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';

function BannerImage({banner}){
 const img=<img src={banner.imageUrl} alt={banner.alt} draggable="false"/>;
 if(!banner.href)return <div className="v3-banner-content">{img}</div>;
 return banner.href.startsWith('/')?<Link className="v3-banner-content" href={banner.href}>{img}</Link>:<a className="v3-banner-content" href={banner.href} target="_blank" rel="noopener noreferrer">{img}</a>;
}
export default function SiteBanner(){
 const [data,setData]=useState(null),[index,setIndex]=useState(0),[paused,setPaused]=useState(false);
 const touch=useRef(null);
 useEffect(()=>{const controller=new AbortController();fetch('/api/banners',{signal:controller.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Banner unavailable');return r.json()}).then(body=>setData(Array.isArray(body.banners)?body.banners:[])).catch(()=>{});return()=>controller.abort()},[]);
 useEffect(()=>{if(!data||data.length<=1||paused)return;const interval=setInterval(()=>setIndex(i=>(i+1)%data.length),5000);return()=>clearInterval(interval)},[data,paused]);
 // Preserve the existing graphic until the banner schema is deployed; with a working
 // schema, zero visible banners means the region is omitted as specified by Figma.
 if(!data){return <section className="v3-hero"><img className="v3-hero-original" src="/figma-v3/hero-logo.svg" alt="바로나도"/><div className="v3-hero-dots" aria-hidden="true"><span/><span/><span/></div></section>}
 if(data.length===0)return null;
 const swipeStart=e=>{setPaused(true);touch.current=e.touches?.[0]?.clientX??null};
 const swipeEnd=e=>{const x=e.changedTouches?.[0]?.clientX;if(touch.current!==null&&typeof x==='number'){const diff=x-touch.current;if(Math.abs(diff)>40)setIndex(i=>(i+(diff<0?1:data.length-1))%data.length)}touch.current=null;setPaused(false)};
 return <section className="v3-hero v3-banner-carousel" aria-label="바로나도 상단 배너" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onTouchStart={swipeStart} onTouchEnd={swipeEnd} onTouchCancel={()=>{touch.current=null;setPaused(false)}}>
  <div className="v3-banner-track" style={{transform:`translateX(-${index*100}%)`}}>{data.map(b=><div className="v3-banner-slide" key={b.id}><BannerImage banner={b}/></div>)}</div>
  {data.length>1&&<div className="v3-hero-dots v3-banner-dots" role="group" aria-label="배너 선택">{data.map((b,i)=><button key={b.id} type="button" aria-label={`${i+1}번째 배너`} aria-current={index===i?'true':undefined} className={index===i?'active':''} onClick={()=>setIndex(i)}/>)}</div>}
 </section>;
}
