'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CATEGORY_RESIDENT, fetchDog } from '../../../lib/dogs';
import SiteHeader from '../../../components/SiteHeader';
import DogLoading from '../../../components/DogLoading';
import ExpandableText from '../../../components/ExpandableText';
import DogActions from '../../../components/DogActions';
import { recordVisit } from '../../../lib/siteAnalytics';
import { formatDogDate, getAgeInfo, getDogBirthDate, getDogProfile, getShelterUrl, isDogBirthday, PROFILE_FIELDS } from '../../../lib/dogProfile';
import { dogVideoMedia, orderedDogMedia } from '../../../lib/dogVideo';
import VaccinationDetails from '../../../components/VaccinationDetails';
import GoDogRecords from '../../../components/GoDogRecords';

function PawIcon() {
  return <svg className="paw" viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M20.3 27.1c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6Zm23.4 0c4.1 0 7.4 4.3 7.4 9.6s-3.3 9.6-7.4 9.6-7.4-4.3-7.4-9.6 3.3-9.6 7.4-9.6ZM15.9 17.7c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9Zm32.2 0c3 0 5.4 3.1 5.4 6.9s-2.4 6.9-5.4 6.9-5.4-3.1-5.4-6.9 2.4-6.9 5.4-6.9ZM32 11.2c3.2 0 5.8 3.4 5.8 7.6s-2.6 7.6-5.8 7.6-5.8-3.4-5.8-7.6 2.6-7.6 5.8-7.6Zm0 29.1c7 0 14.1 5.8 14.1 11.5 0 4.1-3.6 5.3-7.8 4.3-2.1-.5-4.1-1.4-6.3-1.4s-4.2.9-6.3 1.4c-4.2 1-7.8-.2-7.8-4.3 0-5.7 7.1-11.5 14.1-11.5Z"/></svg>;
}

export default function DogDetailPage() {
  const params = useParams();
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSection,setActiveSection]=useState('overview');
  const startX = useRef(null);
  const modalStartX = useRef(null);
  const zoom = useRef({pointers:new Map(),scale:1,x:0,y:0,base:null,wasPinch:false});
  const [zoomState,setZoomState]=useState({scale:1,x:0,y:0});
  const didSwipe = useRef(false);

  useEffect(() => {
    if (!params?.id) return;
    fetchDog(params.id)
      .then(setDog)
      .catch(() => setError('게시글을 찾을 수 없어요.'))
      .finally(() => setLoading(false));
  }, [params?.id]);

  useEffect(() => {
    if (dog?.id) recordVisit('dog', dog.id);
  }, [dog?.id]);

  useEffect(()=>{if(!dog)return;const ids=dog.category===CATEGORY_RESIDENT?['overview','information']:['overview','information','shelter','records'];const update=()=>{let active='overview';for(const id of ids){const el=document.getElementById(id==='records'?'v3-dog-records':'v3-detail-'+id);if(el&&el.getBoundingClientRect().top<=180)active=id;}setActiveSection(active);};update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);},[dog?.id,dog?.category]);
  useEffect(()=>{if(!modalOpen)return;const prior=document.body.style.overflow;document.body.style.overflow='hidden';const escape=e=>{if(e.key==='Escape'){setModalOpen(false);zoom.current={pointers:new Map(),scale:1,x:0,y:0,base:null,wasPinch:false};setZoomState({scale:1,x:0,y:0});}};window.addEventListener('keydown',escape);return()=>{document.body.style.overflow=prior;window.removeEventListener('keydown',escape);};},[modalOpen]);

  const media = dog ? orderedDogMedia(dog.images || [], dogVideoMedia(dog.profile, process.env.NEXT_PUBLIC_SUPABASE_URL)) : [];
  const current = media[index];
  const hasMedia = media.length > 0;
  const profile=dog?getDogProfile(dog):{};
  const resident=dog?.category===CATEGORY_RESIDENT;
  const fieldGroups=dog?[
    {name:'기본 정보',keys:resident?['breed','vaccinations']:['breed','vaccinations','toilet']},
    {name:'성격과 취향',keys:['personality','charm','likes','dislikes']},
    ...(!resident?[{name:'히스토리와 가족',keys:['history','recommended_home','ideal_family']}]:[]),
  ].map(group=>({...group,fields:group.keys.map(key=>PROFILE_FIELDS.find(f=>f.key===key)).filter(f=>f&&Boolean(profile[f.key]))})).filter(g=>g.fields.length):[];
  const hasDetails=fieldGroups.length>0||Boolean(profile.extra_questions?.some(x=>x.question&&x.answer));
  const backHref = dog?.category === CATEGORY_RESIDENT ? '/residents' : '/';

  const resetZoom=()=>{zoom.current={pointers:new Map(),scale:1,x:0,y:0,base:null,wasPinch:false};setZoomState({scale:1,x:0,y:0});};
  const closeImage=()=>{setModalOpen(false);resetZoom();};
  const move = (direction) => {
    if (!hasMedia) return;
    resetZoom();
    setIndex((prev) => (prev + direction + media.length) % media.length);
  };

  const openImage = () => {
    if (didSwipe.current) { didSwipe.current = false; return; }
    if (current?.type !== 'photo') return;
    setModalOpen(true);
  };

  const onPointerDown = (event) => {
    startX.current = event.clientX;
    didSwipe.current = false;
  };

  const onPointerUp = (event) => {
    if (startX.current === null) return;
    const diff = event.clientX - startX.current;
    if (Math.abs(diff) > 35) { didSwipe.current = true; move(diff < 0 ? 1 : -1); }
    startX.current = null;
  };

  // Two-finger pinch / drag preserves the image's natural aspect ratio.
  const onModalPointerDown = event => {
    const z=zoom.current;
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}
    z.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(z.pointers.size===1){modalStartX.current=event.clientX;z.drag={x:event.clientX,y:event.clientY,origX:z.x,origY:z.y};}
    if(z.pointers.size===2){
      z.wasPinch=true;const [a,b]=[...z.pointers.values()];
      z.base={distance:Math.hypot(a.x-b.x,a.y-b.y)||1,scale:z.scale,x:z.x,y:z.y,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};
    }
  };
  const onModalPointerMove = event => {
    const z=zoom.current;if(!z.pointers.has(event.pointerId))return;
    z.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(z.pointers.size>=2&&z.base){
      const [a,b]=[...z.pointers.values()];const next=Math.max(1,Math.min(4,z.base.scale*Math.hypot(a.x-b.x,a.y-b.y)/z.base.distance));
      z.scale=next;z.x=next>1?z.base.x+((a.x+b.x)/2-z.base.cx):0;z.y=next>1?z.base.y+((a.y+b.y)/2-z.base.cy):0;
      setZoomState({scale:z.scale,x:z.x,y:z.y});
    }else if(z.pointers.size===1&&z.scale>1&&z.drag){
      z.x=z.drag.origX+event.clientX-z.drag.x;z.y=z.drag.origY+event.clientY-z.drag.y;
      setZoomState({scale:z.scale,x:z.x,y:z.y});
    }
  };
  const onModalPointerUp = event => {
    const z=zoom.current;
    if(!z.wasPinch&&z.scale===1&&modalStartX.current!==null&&z.pointers.size===1){
      const diff=event.clientX-modalStartX.current;if(Math.abs(diff)>35)move(diff<0?1:-1);
    }
    z.pointers.delete(event.pointerId);z.base=null;z.drag=null;modalStartX.current=null;
    if(z.pointers.size===0)z.wasPinch=false;
  };

  return (
    <main className={"site-shell v3-site v3-detail-site "+(dog?.category===CATEGORY_RESIDENT?"v3-resident-detail":"v3-adoption-detail")}>
      <SiteHeader />
      <section className="container detail-container has-detail-actions">
        <div className="v3-detail-banner"><Link className="v3-back" href={backHref} onClick={event=>{if(typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('from')==='list'&&window.history.length>1){event.preventDefault();window.history.back();}}}>‹ 뒤로 가기</Link><strong>{dog?.category===CATEGORY_RESIDENT?"상주견 소개":"가족을 찾아요"}</strong></div>

        {loading && <DogLoading />}
        {error && <div className="message error">{error}</div>}

        {dog && (
          <>
          <nav className={'v3-detail-tabs'+(dog.category===CATEGORY_RESIDENT?' is-resident':'')+(dog.category===CATEGORY_RESIDENT&&!hasDetails?' is-intro-only':'')} aria-label="상세 페이지 메뉴">
           <button type="button" className={activeSection==='overview'?'active':''} aria-current={activeSection==='overview'?'location':undefined} onClick={()=>{setActiveSection('overview');document.getElementById('v3-detail-overview')?.scrollIntoView({behavior:'smooth'})}}>소개</button>
           {hasDetails&&<button type="button" className={activeSection==='information'?'active':''} aria-current={activeSection==='information'?'location':undefined} onClick={()=>{setActiveSection('information');document.getElementById('v3-detail-information')?.scrollIntoView({behavior:'smooth'})}}>상세 정보</button>}
           {dog.category!==CATEGORY_RESIDENT&&<><button type="button" className={activeSection==='shelter'?'active':''} aria-current={activeSection==='shelter'?'location':undefined} onClick={()=>{setActiveSection('shelter');document.getElementById('v3-detail-shelter')?.scrollIntoView({behavior:'smooth'})}}>보호소</button><button type="button" className={activeSection==='records'?'active':''} aria-current={activeSection==='records'?'location':undefined} onClick={()=>{setActiveSection('records');document.getElementById('v3-dog-records')?.scrollIntoView({behavior:'smooth'})}}>멍기록</button></>}
          </nav>
          <article className="detail-card v3-figma-detail">
           <header className="v3-detail-identity">
            <h1 className="dog-name">{dog.name}{isDogBirthday(dog)&&<span className="birthday-icon" role="img" aria-label="생일 축하"> 🎉</span>}</h1>
            <p className="meta">{dog.gender} ㅣ 중성화 {dog.neutered?'O':'X'} ㅣ {getAgeInfo(dog).detailDisplay}</p>
            {resident&&getDogBirthDate(dog)&&<p className="arrival-date">생년월일 · {formatDogDate(getDogBirthDate(dog))}</p>}
            {dog.category!==CATEGORY_RESIDENT&&dog.arrived_at&&<p className="arrival-date">바로나도에 온 날 · {formatDogDate(dog.arrived_at)}</p>}
            {dog.category!==CATEGORY_RESIDENT&&dog.adopted&&dog.adopted_at&&<p className="arrival-date">입양 간 날짜 · {formatDogDate(dog.adopted_at)}</p>}
           </header>
           <div className="gallery v3-detail-gallery" onPointerDown={onPointerDown} onPointerUp={onPointerUp} title={current?.type==='photo'?'사진 크게 보기':undefined}>
            {current?.type==='video'
             ? <div className="gallery-main gallery-video-frame"><video key={current.url} src={current.url} poster={current.poster||undefined} controls preload="none" playsInline aria-label={dog.name+' 동영상'}/></div>
             : <button type="button" className="gallery-main" onClick={openImage} aria-label="사진 크게 보기" disabled={!hasMedia}>{current?<img src={current.url} alt={dog.name+' 사진 '+(index+1)}/>:<PawIcon/>}{current&&<span className="zoom-hint" aria-hidden="true">⛶</span>}</button>}
            {dog.adopted&&<span className="adopted-badge detail"><strong>입양 완료</strong></span>}
           </div>
           <nav className="v3-detail-gallery-navigation" aria-label="강아지 사진 이동">
            <button type="button" onClick={()=>move(-1)} disabled={media.length<2}>‹ 이전</button>
            <span>{hasMedia?index+1:0} / {media.length||0}</span>
            <button type="button" onClick={()=>move(1)} disabled={media.length<2}>다음 ›</button>
           </nav>
           <div className="v3-detail-divider" aria-hidden="true"/>
           <section className="v3-detail-about" id="v3-detail-overview">
            <h2>{dog.name}를 소개합니다</h2>
            <ExpandableText key={dog.id} limit={Infinity} text={getDogProfile(dog).introduction||dog.description||'아직 소개글이 등록되지 않았어요.'} className="desc"/>
           </section>
           {hasDetails&&<section className="v3-detail-properties" id="v3-detail-information">
            <h2>상세 정보</h2>
            {fieldGroups.map(group=><div className="v3-detail-property-group" key={group.name}>
              <h3>{group.name}</h3>
              <div className="v3-detail-properties-table">{group.fields.map(field=><div className="v3-detail-property" key={field.key}><span>{field.key==='ideal_family'?<>이 아이에게<br/>필요한 가족</>:field.label}</span><div>{field.key==='vaccinations'?<VaccinationDetails profile={profile} inline/>:<ExpandableText text={profile[field.key]}/>}</div></div>)}</div>
            </div>)}
            {Array.isArray(profile.extra_questions)&&profile.extra_questions.some(x=>x.question&&x.answer)&&<div className="v3-detail-property-group"><h3>추가 정보</h3><div className="v3-detail-properties-table">{profile.extra_questions.filter(x=>x.question&&x.answer).map((x,i)=><div className="v3-detail-property" key={i}><span>{x.question}</span><div>{x.answer}</div></div>)}</div></div>}
           </section>}
           {dog.category!==CATEGORY_RESIDENT&&(profile.shelter_name||profile.shelter_url)&&<section className="v3-detail-shelter" id="v3-detail-shelter"><h2>보호소</h2><p>{profile.shelter_name||'보호소 정보 준비 중'}</p>{getShelterUrl(profile.shelter_url)&&<a href={getShelterUrl(profile.shelter_url)} target="_blank" rel="noopener noreferrer">보호소 홈페이지 ↗</a>}</section>}
          </article>
          </>
        )}
        {dog&&dog.category!==CATEGORY_RESIDENT&&<div id="v3-dog-records"><GoDogRecords key={dog.id} dog={dog}/></div>}
      </section>

      {dog && <DogActions dog={dog} hidden={modalOpen} />}

      {modalOpen && hasMedia && (
        <div className="image-modal viewer-modal v3-detail-viewer" role="dialog" aria-modal="true" aria-label="사진 확대 보기" onClick={closeImage}>
          <button className="modal-close" aria-label="닫기" onClick={event=>{event.stopPropagation();closeImage();}}>×</button>
          {media.length > 1 && (
            <button type="button" className="modal-nav modal-prev" aria-label="이전 미디어" onClick={(event) => { event.stopPropagation(); move(-1); }}>‹</button>
          )}
          {current?.type === 'video'
            ? <video key={current.url} src={current.url} poster={current.poster || undefined} controls preload="none" playsInline onClick={event => event.stopPropagation()} aria-label={`${dog.name} 동영상`} />
            : <img src={current?.url} alt={`${dog.name} 크게 보기 ${index + 1}`} draggable={false} style={{transform:`translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`}} onClick={event=>event.stopPropagation()} onPointerDown={onModalPointerDown} onPointerMove={onModalPointerMove} onPointerUp={onModalPointerUp} onPointerCancel={onModalPointerUp} />}
          {media.length > 1 && <span className="photo-count modal-count" aria-live="polite">{current?.type === 'video' ? '동영상' : '사진'} {index + 1} / {media.length}</span>}
          {media.length > 1 && (
            <button type="button" className="modal-nav modal-next" aria-label="다음 미디어" onClick={(event) => { event.stopPropagation(); move(1); }}>›</button>
          )}
        </div>
      )}
    </main>
  );
}
