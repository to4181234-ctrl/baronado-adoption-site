'use client';
import Link from 'next/link';
import GoPixelChoice from './GoPixelChoice.js';
import {useCallback,useEffect,useRef,useState} from 'react';
import {fetchDogs} from '../lib/dogs.js';
import {figmaSprite,FIGMA_DOGS,gameElement} from '../lib/goV3Game.js';
import GoShell,{useGoSession} from './GoShell.js';
import GoDogAlbum from './GoDogAlbum.js';
import GoCamera from './GoCamera.js';
import GoCard from './GoCard.js';
import GoAlbumBattleRecords from './GoAlbumBattleRecords.js';
import {koreaDay} from '../lib/goCoins.js';
const EMPTY={counts:{},covers:{},progress:null,standing:null,ready:false};
const STAGE2_ENABLED=process.env.NEXT_PUBLIC_MEONGGO_STAGE2_OFFICIAL_ENABLED==='1';
const STAGE3_COINS_ENABLED=process.env.NEXT_PUBLIC_MEONGGO_STAGE1_COINS_ENABLED==='1';
const FIGMA_ALBUM_SHADOW = {깡지:'/figma-v3/album-shadow-kangji.svg',버디:'/figma-v3/album-shadow-buddy.svg',뽀실:'/figma-v3/album-shadow-pposil.svg',구름:'/figma-v3/album-shadow-gureum.svg',오레오:'/figma-v3/album-shadow-oreo.svg'};
function Album({initialDogId=null}){
 const {member,ready,openAccount,logout}=useGoSession();
 const [dogs,setDogs]=useState([]),[loadingDogs,setLoadingDogs]=useState(true),[collection,setCollection]=useState(EMPTY);
 const [error,setError]=useState(''),[ownCards,setOwnCards]=useState([]),[cardTotal,setCardTotal]=useState(0),[cardPage,setCardPage]=useState(0),[order,setOrder]=useState('newest');
 const [camera,setCamera]=useState(null),[collectConfirm,setCollectConfirm]=useState(false),[selection,setSelection]=useState(false),[selectedIds,setSelectedIds]=useState([]),[deleting,setDeleting]=useState(false);
 const [notice,setNotice]=useState(''),[showAdopted,setShowAdopted]=useState(false);
 const [questSeen,setQuestSeen]=useState(true);
 const [officialDogs,setOfficialDogs]=useState([]),[officialLoaded,setOfficialLoaded]=useState(!STAGE2_ENABLED);
 const dogId=initialDogId;
 useEffect(()=>{try{setQuestSeen(localStorage.getItem('meonggo:quest-seen:'+koreaDay())==='1');}catch{setQuestSeen(false);}},[]);
 const dog=dogs.find(x=>x.id===dogId)||null;
 useEffect(()=>{fetchDogs('adoption').then(setDogs).catch(()=>setError('강아지 목록을 불러오지 못했어요.')).finally(()=>setLoadingDogs(false));},[]);
 const reloadCollection=useCallback(()=>{if(!member){setCollection(EMPTY);return Promise.resolve();}return fetch('/api/go/collection'+(dogId?'?dog='+encodeURIComponent(dogId):''),{cache:'no-store'}).then(r=>r.json()).then(data=>{if(data.error)throw Error(data.error);setCollection({...data,ready:true});}).catch(e=>setError(e.message));},[member?.id,dogId]);
 const reloadCards=useCallback(()=>{if(!member){setOwnCards([]);return Promise.resolve();}const p=new URLSearchParams({mine:'1',page:String(cardPage),limit:'4',order});if(dogId)p.set('dog',dogId);return fetch('/api/go/cards?'+p,{cache:'no-store'}).then(r=>r.json()).then(data=>{if(data.error)throw Error(data.error);setOwnCards(data.cards||[]);setCardTotal(data.total||0);}).catch(e=>setError(e.message));},[member?.id,cardPage,order,dogId]);
 useEffect(()=>{reloadCollection();},[reloadCollection]);
 useEffect(()=>{
  if(!STAGE2_ENABLED){setOfficialDogs([]);setOfficialLoaded(true);return;}
  let active=true;
  setOfficialLoaded(false);
  fetch('/api/go/official',{cache:'no-store'}).then(async r=>{
   const d=await r.json();if(!r.ok)throw Error(d.error||'공식 도감을 불러오지 못했어요.');return d;
  }).then(d=>{if(active){setOfficialDogs(d.dogs||[]);setOfficialLoaded(true);}})
   .catch(e=>{if(active){setOfficialDogs([]);setOfficialLoaded(false);setError(e.message);}});
  return()=>{active=false;};
 },[member?.id]);
 useEffect(()=>{reloadCards();},[reloadCards]);
 useEffect(()=>{setCardPage(0);setSelection(false);setSelectedIds([]);},[dogId,member?.id]);
 const count=dogId?(collection.counts?.[dogId]||0):0;
 const hasDogCards=id=>Boolean((collection.counts?.[id]||0)>0 || officialDogs.some(o=>o.dogId===id&&(o.collected>0||o.hidden?.unlocked)));
 const claimed=FIGMA_DOGS.filter(name=>{const d=dogs.find(x=>x.name===name);return Boolean(d&&member&&hasDogCards(d.id));}).length;
 const totalDogs=FIGMA_DOGS.length;
 const orderedDogs=FIGMA_DOGS.slice().sort((a,b)=>{const da=dogs.find(x=>x.name===a),db=dogs.find(x=>x.name===b),oa=da&&member&&hasDogCards(da.id),ob=db&&member&&hasDogCards(db.id);return Number(Boolean(ob))-Number(Boolean(oa));});
 const figure=(name,unlocked=false,shadow=false)=>figmaSprite(name,shadow||!unlocked?'shadow':'front');
 function toggle(id){setSelectedIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id].slice(0,50));}
 async function deleteSelected(){
  if(!selectedIds.length||deleting)return;
  if(!confirm('선택한 카드 '+selectedIds.length+'개를 삭제할까요? 카드와 사진은 복구할 수 없어요. 해당 강아지의 마지막 카드를 삭제하면 도감 획득 기록과 배틀 전적도 사라져요.'))return;
  setDeleting(true);
  try{const r=await fetch('/api/go/cards',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:selectedIds})});const d=await r.json();if(!r.ok)throw Error(d.error||'삭제에 실패했어요.');setNotice((d.deletedIds?.length||0)+'개의 카드를 삭제했어요.');setSelectedIds([]);setSelection(false);setCardPage(0);await Promise.all([reloadCards(),reloadCollection()]);}catch(e){setNotice(e.message);}finally{setDeleting(false);}
 }
 function CardList(){return <><div className="v3-card-list">{ownCards.map(card=>selection?<GoCard key={card.id} card={card} member={member} onLogin={openAccount} compact previewStats selectMode selected={selectedIds.includes(card.id)} onSelect={toggle}/>:<GoCard key={card.id} card={card} member={member} onLogin={openAccount} compact previewStats linkToPost onDelete={()=>{reloadCards();reloadCollection();}}/>)}</div><div className="v3-pager"><button disabled={cardPage===0} onClick={()=>setCardPage(x=>x-1)}>〈</button><span>{cardPage+1} / {Math.max(1,Math.ceil(cardTotal/4))}</span><button disabled={(cardPage+1)*4>=cardTotal} onClick={()=>setCardPage(x=>x+1)}>〉</button></div></>;}
 return <>
  {dogId?<div className="v3-album-detail">
   {dog?<><section className="v3-album-yellow"><div><h1>{dog.name} 도감</h1>{count>0&&<>{dog.adopted?<p>입양을 완료한 멍멍이예요.</p>:collection.standing?.rank&&collection.standing?.participants?<><p>{member?.nickname||'멍기록가'}님은 {dog.name} 멍기록가 중 상위 {Math.ceil(collection.standing.rank/collection.standing.participants*100)}% 입니다</p><small>보유 카드 수 기준 · 같은 수는 공동 순위</small></>:null}</>}<small>보유 카드 수 {count}장</small></div><div className="v3-album-dog-row">{count>0?<Link href={'/go/interact/'+dog.id} className="v3-album-avatar"><img src={figure(dog.name,true)} alt={dog.name}/><span>{dog.name} 만나러가기 ›</span></Link>:<div className="v3-album-avatar"><img src={figure(dog.name,false)} alt="미획득 실루엣"/><Link href={'/dogs/'+dog.id}>힌트 보러가기 ›</Link></div>}<div><h3>{dog.name}</h3><p>수집 카드<br/>{count}장</p><p>속성<br/><b>{count>0?`✦ ${gameElement(dog.name)}`:'미공개'}</b></p></div></div>{!dog.adopted&&<button className="v3-album-collect" onClick={()=>member?setCollectConfirm(true):openAccount()}>멍카드 수집하러가기 ›</button>}</section>
   <div className="v3-album-cards"><div className="v3-section-bar"><h2>수집한 카드 ({cardTotal}장)</h2><select aria-label="카드 정렬" value={order} onChange={e=>{setCardPage(0);setOrder(e.target.value)}}><option value="newest">등록 순서 | 최신순</option><option value="oldest">등록 순서 | 오래된순</option></select></div>
    {member&&<div className="v3-manage"><button onClick={()=>{setSelection(v=>!v);setSelectedIds([]);}}>{selection?'선택 취소':'내 카드 관리'}</button>{selection&&<button disabled={!selectedIds.length||deleting} onClick={deleteSelected}>{deleting?'삭제 중…':'선택 '+selectedIds.length+'장 삭제'}</button>}</div>}
    {!member?<p className="v3-status" onClick={openAccount}>로그인하면 수집한 카드가 나타나요. <button onClick={openAccount}>로그인하기</button></p>:cardTotal?<CardList/>:<div className="v3-empty-collection">아직 수집한 카드가 없어요.<br/>힌트에서 {dog.name}의 이야기를 만나보세요.</div>}</div>
   </>:loadingDogs?<p className="v3-status">도감을 불러오는 중…</p>:<p className="v3-error">도감을 찾지 못했어요.</p>}
   <Link href="/go" className="v3-return-link">← 내 도감으로 돌아가기</Link>
  </div>:<div className={'v3-album-home v3-album-figma '+(member?'v3-album-member':'v3-album-guest')}>
    <section className="v3-profile-head"><div className="v3-profile-avatar"><img className={!member?'v3-profile-anon-silhouette':undefined} src={member?figmaSprite(member.avatarDog||'구름',member.avatarDog?'front':'shadow'):'/figma-v3/album-shadow-buddy.svg'} alt={member?'프로필 캐릭터':'미획득 실루엣'}/></div><div>{member?<><h1>{member.nickname}</h1><p>멍기록가</p><small>{member.profileBio||'자기소개가 없습니다.'}</small><Link href="/go/profile"><img className="v3-album-pixel-arrow" src="/figma-v3/album-login-arrow.svg" alt="" aria-hidden="true"/>프로필 수정</Link><button type="button" className="v3-profile-logout" onClick={logout}><img className="v3-album-pixel-arrow" src="/figma-v3/album-login-arrow.svg" alt="" aria-hidden="true"/>로그아웃</button></>:<><h1 className="v3-anon-heading">멍기록가를 기다리는중!</h1><p>멍기록가</p><small className="v3-anon-lede">로그인하고 나만의 멍멍 도감 채우기</small><button type="button" className="v3-profile-login s1-login-primary" onClick={openAccount}><img className="v3-album-pixel-arrow" src="/figma-v3/album-login-arrow.svg" alt="" aria-hidden="true"/>로그인하고 시작하기</button><Link className="s1-browse-first" href="/go/community">먼저 둘러보기 ›</Link></>}</div></section>
    <div className="v3-home-quest-shortcut"><Link href="/go/quests" onClick={()=>{setQuestSeen(true);try{localStorage.setItem('meonggo:quest-seen:'+koreaDay(),'1');}catch{}}}>{!questSeen&&<span className="v3-home-quest-new">NEW</span>}<strong>오늘의 멍코인 퀘스트 보러가기 &gt;</strong><small>매일 자정에 업데이트!</small></Link></div>
    <section id="meonggo-album" className="v3-collection-section"><h2>내 도감</h2><div className="v3-progress-label">도감 수집 {officialLoaded?claimed:'—'} / {totalDogs}{member&&claimed===0?' (첫 도감을 기다리고 있어요)':''}</div><div className="v3-progress"><span style={{width:(officialLoaded?claimed/totalDogs*100:0)+'%'}}/></div>
     <div className="v3-collection-grid">{orderedDogs.map(name=>{const d=dogs.find(x=>x.name===name),owned=Boolean(d&&member&&hasDogCards(d.id));return <Link href={d?'/go/'+d.id:'/go'} className={'v3-collection-tile'+(owned?' unlocked':'')} key={name}><img src={owned?figure(name,true):FIGMA_ALBUM_SHADOW[name]||figure(name,false)} alt={owned?name:'미획득 실루엣'}/><strong>{name}</strong></Link>})}</div></section>
    <GoAlbumBattleRecords dogs={dogs} records={collection.battleRecords} member={member} ready={collection.ready}/>
  </div>}
  {notice&&<p className="v3-message" role="status">{notice}</p>}{error&&<p className="v3-error" role="alert">{error}</p>}
  {collectConfirm&&dog&&<div className="v3-discovery-backdrop v3-discovery-figma" role="presentation" onClick={()=>setCollectConfirm(false)}><section className="v3-discovery-modal v3-collection-confirm" role="dialog" aria-modal="true" aria-label="멍카드 수집 준비" onClick={e=>e.stopPropagation()}>
  <button className="v3-discovery-close" aria-label="닫기" onClick={()=>setCollectConfirm(false)}>×</button>
  <h2><img className="v3-discovery-figma-title" src="/figma-v3/discovery-title.svg" alt="멍멍GO!"/></h2>
  <div className="v3-discovery-stage" aria-hidden="true"><img className="v3-discovery-reveal" src="/figma-v3/collar.png" alt=""/></div>
  <div className="v3-discovery-dialog">
   {['bg','outer','inner'].map(n=><img key={n} className={'v3-discovery-dialog-layer v3-discovery-dialog-'+n} src={'/figma-v3/discovery-dialog-'+n+'.svg'} alt=""/>)}
   <div className="v3-discovery-dialog-content">멍카드 수집 할 준비 되셨나요?
    <GoPixelChoice initial onClick={()=>{setCollectConfirm(false);setCamera(dog);}}>네</GoPixelChoice>
    <GoPixelChoice onClick={()=>setCollectConfirm(false)}>아직..</GoPixelChoice>
   </div>
  </div>
 </section></div>}
  {camera&&<div className="v3-camera-backdrop" role="presentation"><section className="v3-camera-panel" role="dialog" aria-modal="true" aria-label="멍멍이 카드 촬영"><button className="v3-camera-close" onClick={()=>setCamera(null)} aria-label="카메라 닫기">×</button><GoCamera dog={camera} nickname={member?.nickname} standing={collection.standing} firstCard={!collection.counts?.[camera.id]} onSaved={()=>{reloadCards();reloadCollection();}} onDone={()=>setCamera(null)}/></section></div>}
 </>;
}
export default function GoPage({dogId=null}){return <GoShell active="album" albumDetail={Boolean(dogId)}>{dogId?<GoDogAlbum dogId={dogId}/>:<Album initialDogId={null}/>}</GoShell>}
