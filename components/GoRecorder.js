'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import GoShell from './GoShell.js';
import GoCardFace from './GoCardFace.js';
import {LockedOfficialCard} from './GoStage2OfficialCards.js';
import {figmaSprite,gameElementIcon} from '../lib/goV3Game.js';
import {CARD_FACE} from '../lib/goCardFace.js';
const SHADOWS={깡지:'kangji',버디:'buddy',뽀실:'pposil',구름:'gureum',오레오:'oreo'};
function OfficialCard({card,dog}){
 if(!card.owned)return <LockedOfficialCard slot={card.slot} hidden={card.slot===5}/>;
 if(!card.imageUrl)return <div className="s4-asset-unavailable" role="status">카드 이미지를 불러오지 못했어요.</div>;
 if(card.slot===5)return <img className="s4-public-hidden-art" src={card.imageUrl} alt={`${dog.name} HIDDEN 특별 일러스트`}/>;
 return <GoCardFace card={{dogName:dog.name,officialSlot:card.slot,imageUrl:card.imageUrl,
  nickname:'바로나도',battle:{power:card.power??0,charm:card.charm??0,element:dog.element},
  ratings:{cuteness:card.power??0,affection:card.charm??0}}}/>;
}
function RecordPanel({records,available}){
 const [page,setPage]=useState(0);
 const total=records.length,current=Math.min(page,Math.max(total-1,0)),record=records[current];
 return <section className="s4-public-records" aria-label="공개 배틀 전적"><h2>멍배틀 전적</h2>
  <div className="s4-record-frame"><img src="/figma-v3/album-panel-bg.svg" alt=""/><img src="/figma-v3/album-panel-outer.svg" alt=""/><img src="/figma-v3/album-panel-inner.svg" alt=""/>
   <div><p>멍멍이별 대결 전적</p><p aria-live="polite">{!available?'공개 전적을 확인할 수 없어요.':record?`${record.name} 카드  ${record.wins}승 · ${record.draws}무 · ${record.losses}패`:'아직 공개된 배틀 전적이 없어요.'}</p></div>
  </div><nav className="s4-record-nav" aria-label="전적 페이지"><button disabled={!total||current===0} onClick={()=>setPage(current-1)}>이전</button><span>{total?current+1:0} / {total}</span><button disabled={!total||current>=total-1} onClick={()=>setPage(current+1)}>다음</button></nav>
 </section>;
}
function Recorder({id}){
 const [data,setData]=useState(null),[dogId,setDogId]=useState(null),[kind,setKind]=useState('official'),[order,setOrder]=useState('newest'),[page,setPage]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');
  const p=new URLSearchParams({order,page:String(page),kind});if(dogId)p.set('dog',dogId);
  fetch(`/api/go/recorders/${id}?${p}`,{signal:controller.signal,cache:'no-store'}).then(async r=>{const x=await r.json();if(!r.ok)throw Error(x.error||'공개 프로필을 불러오지 못했어요.');if(!controller.signal.aborted)setData(x);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[id,dogId,kind,order,page]);
 function openDog(id,nextKind='official'){setDogId(id);setKind(nextKind);setPage(0);setOrder('newest');}
 const profile=data?.profile,dogs=data?.dogs||[],selected=data?.dog;
 return <div className="s4-public-profile">
 {error&&<p className="s4-public-error" role="alert">{error}</p>}{loading&&!profile&&<p className="s4-public-loading" role="status">공개 도감을 불러오고 있어요.</p>}
 {!selected?profile&&<>
  <section className="s4-identity"><div className="s4-avatar"><img src={figmaSprite(profile.avatarDog||'구름')} alt="대표 캐릭터"/></div><div><h1>{profile.nickname}</h1><span>멍기록가</span><p>{profile.bio||'아직 소개가 없어요.'}</p></div></section>
  <div className="s4-public-home"><Link href="/go/community" className="s4-home-back">← 모두의 도감</Link>
   <h2>{profile.nickname}님의 도감</h2><p className="s4-progress-label">공개 도감 {profile.dogs} / {dogs.length}</p>
   <div className="s4-progress"><span style={{width:dogs.length?`${profile.dogs/dogs.length*100}%`:'0%'}}/></div>
   <div className="s4-dog-grid">{dogs.map(d=><button className={d.publicCount?'s4-known':''} type="button" key={d.id} onClick={()=>openDog(d.id)} aria-label={`${d.name} 공개 도감 보기`}><img src={d.publicCount?figmaSprite(d.name):`/figma-v3/album-shadow-${SHADOWS[d.name]||'pposil'}.svg`} alt=""/><strong>{d.name}</strong></button>)}</div>
   <RecordPanel records={data.records||[]} available={data.recordsAvailable}/>
  </div></>:profile&&selected&&<>
  <section className="s4-dog-banner"><h1>{profile.nickname}님의 {selected.name} 도감</h1><p>{profile.nickname}님의 공개 도감</p><div className="s4-dog-summary"><img src={figmaSprite(selected.name)} alt=""/><div><strong>{selected.name}</strong><p>공개 카드</p><p>총 {selected.publicCount}장</p><p>속성</p><p className="s4-element-value"><img src={gameElementIcon(selected.name)} alt=""/>{selected.element}</p></div></div><p>멍카드 {selected.officialCount}장 · 공개한 나만의 카드 {selected.customCount}장</p></section>
  <div className={"s4-detail-body"+(kind==='custom'?' s4-custom-body':'')}><div className="s4-detail-toolbar"><label><select aria-label="카드 종류" value={kind} onChange={e=>{setKind(e.target.value);setPage(0);}}><option value="official">멍카드</option><option value="custom">나만의 카드</option></select></label><span>({kind==='official'?selected.officialCount:selected.customCount}장)</span>{kind==='custom'?<label className="s4-sort"><span>등록 순서 | </span><select aria-label="등록 정렬" value={order} onChange={e=>{setOrder(e.target.value);setPage(0);}}><option value="newest">최신순</option><option value="oldest">오래된순</option></select></label>:<span className="s4-sort">등록 순서 | 최신순</span>}</div>
  {loading?<p className="s4-public-loading">공개 카드를 불러오고 있어요.</p>:kind==='official'?<div className="s4-card-grid">{(data.slots||[]).map(c=><div key={c.slot} className="s4-public-card"><OfficialCard card={c} dog={selected}/></div>)}</div>:<><div className="s4-card-grid">{(data.cards||[]).map(c=><div key={c.id} className="s4-public-card"><GoCardFace card={c}/></div>)}</div>{!data.cards?.length&&<p className="s4-public-loading">공개한 나만의 카드가 없어요.</p>}{data.total>12&&<nav className="s4-custom-nav"><button disabled={!page} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page+1} / {Math.ceil(data.total/12)}</span><button disabled={!data.hasMore} onClick={()=>setPage(p=>p+1)}>다음</button></nav>}</>}
  <button type="button" className="s4-profile-return" onClick={()=>{setDogId(null);setPage(0);}}>← {profile.nickname}님의 프로필로</button></div>
  </>}
 </div>;
}
export default function GoRecorder({id}){return <GoShell active="recorder"><Recorder key={id} id={id}/></GoShell>;}
