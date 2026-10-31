'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {fetchDogs} from '../lib/dogs.js';
import {figmaSprite,FIGMA_DOGS,gameElement} from '../lib/goV3Game.js';
import GoShell,{useGoSession} from './GoShell.js';
import GoCamera from './GoCamera.js';
import GoCard from './GoCard.js';
const EMPTY={counts:{},covers:{},progress:null,standing:null,ready:false};
function Album({initialDogId=null}){
 const {member,ready,openAccount}=useGoSession();
 const [dogs,setDogs]=useState([]),[loadingDogs,setLoadingDogs]=useState(true),[collection,setCollection]=useState(EMPTY);
 const [error,setError]=useState(''),[ownCards,setOwnCards]=useState([]),[cardTotal,setCardTotal]=useState(0),[cardPage,setCardPage]=useState(0),[order,setOrder]=useState('newest');
 const [camera,setCamera]=useState(null),[selection,setSelection]=useState(false),[selectedIds,setSelectedIds]=useState([]),[deleting,setDeleting]=useState(false);
 const [notice,setNotice]=useState(''),[stampBusy,setStampBusy]=useState(false),[showAdopted,setShowAdopted]=useState(false);
 const dogId=initialDogId;
 const dog=dogs.find(x=>x.id===dogId)||null;
 useEffect(()=>{fetchDogs('adoption').then(setDogs).catch(()=>setError('강아지 목록을 불러오지 못했어요.')).finally(()=>setLoadingDogs(false));},[]);
 const reloadCollection=useCallback(()=>{if(!member){setCollection(EMPTY);return Promise.resolve();}return fetch('/api/go/collection',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(data.error)throw Error(data.error);setCollection({...data,ready:true});}).catch(e=>setError(e.message));},[member?.id]);
 const reloadCards=useCallback(()=>{if(!member){setOwnCards([]);return Promise.resolve();}const p=new URLSearchParams({mine:'1',page:String(cardPage),limit:'4',order});if(dogId)p.set('dog',dogId);return fetch('/api/go/cards?'+p,{cache:'no-store'}).then(r=>r.json()).then(data=>{if(data.error)throw Error(data.error);setOwnCards(data.cards||[]);setCardTotal(data.total||0);}).catch(e=>setError(e.message));},[member?.id,cardPage,order,dogId]);
 useEffect(()=>{reloadCollection();},[reloadCollection]);
 useEffect(()=>{reloadCards();},[reloadCards]);
 useEffect(()=>{setCardPage(0);setSelection(false);setSelectedIds([]);},[dogId,member?.id]);
 const count=dogId?(collection.counts?.[dogId]||0):0;
 const claimed=FIGMA_DOGS.filter(name=>{const d=dogs.find(x=>x.name===name);return d&&(collection.counts?.[d.id]||0)>0;}).length;
 const totalDogs=FIGMA_DOGS.length;
 const figure=(name,unlocked=false,shadow=false)=>figmaSprite(name,shadow||!unlocked?'shadow':'front');
 function toggle(id){setSelectedIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id].slice(0,50));}
 async function deleteSelected(){
  if(!selectedIds.length||deleting)return;
  if(!confirm('선택한 카드 '+selectedIds.length+'개를 삭제할까요? 카드와 사진은 복구할 수 없어요.'))return;
  setDeleting(true);
  try{const r=await fetch('/api/go/cards',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:selectedIds})});const d=await r.json();if(!r.ok)throw Error(d.error||'삭제에 실패했어요.');setNotice((d.deletedIds?.length||0)+'개의 카드를 삭제했어요.');setSelectedIds([]);setSelection(false);setCardPage(0);await Promise.all([reloadCards(),reloadCollection()]);}catch(e){setNotice(e.message);}finally{setDeleting(false);}
 }
 async function claim(){if(stampBusy)return;setStampBusy(true);try{const r=await fetch('/api/go/collection',{method:'POST'});const d=await r.json();if(!r.ok)throw Error(d.error);setNotice('완성 스탬프를 받았어요!');reloadCollection();}catch(e){setNotice(e.message);}finally{setStampBusy(false);}}
 function CardList(){return <><div className="v3-card-list">{ownCards.map(card=>selection?<GoCard key={card.id} card={card} member={member} onLogin={openAccount} compact previewStats selectMode selected={selectedIds.includes(card.id)} onSelect={toggle}/>:<GoCard key={card.id} card={card} member={member} onLogin={openAccount} compact previewStats linkToPost onDelete={()=>{reloadCards();reloadCollection();}}/>)}</div><div className="v3-pager"><button disabled={cardPage===0} onClick={()=>setCardPage(x=>x-1)}>〈</button><span>{cardPage+1} / {Math.max(1,Math.ceil(cardTotal/4))}</span><button disabled={(cardPage+1)*4>=cardTotal} onClick={()=>setCardPage(x=>x+1)}>〉</button></div></>;}
 return <>
  {dogId?<div className="v3-album-detail">
   {dog?<><section className="v3-album-yellow"><div><h1>{dog.name} 도감</h1><p>{dog.adopted?'입양을 완료한 멍멍이예요.':'고라이스는 '+dog.name+' 멍기록가 중 상위에 있어요'}</p><small>보유 카드 수 {count}장</small></div><div className="v3-album-dog-row"><Link href={'/go/interact/'+dog.id} className="v3-album-avatar"><img src={figure(dog.name,count>0)} alt={dog.name}/><span>{dog.name} 만나러가기 ›</span></Link><div><h3>{dog.name}</h3><p>수집 카드<br/>{count}장</p><p>속성<br/><b>✦ {gameElement(dog.name)}</b></p></div></div>{!dog.adopted&&<button className="v3-album-collect" onClick={()=>member?setCamera(dog):openAccount()}>멍카드 수집하러가기 ›</button>}</section>
   <div className="v3-album-cards"><div className="v3-section-bar"><h2>수집한 카드 ({cardTotal}장)</h2><select aria-label="카드 정렬" value={order} onChange={e=>{setCardPage(0);setOrder(e.target.value)}}><option value="newest">등록 순서 | 최신순</option><option value="oldest">등록 순서 | 오래된순</option></select></div>
    {member&&<div className="v3-manage"><button onClick={()=>{setSelection(v=>!v);setSelectedIds([]);}}>{selection?'선택 취소':'내 카드 관리'}</button>{selection&&<button disabled={!selectedIds.length||deleting} onClick={deleteSelected}>{deleting?'삭제 중…':'선택 '+selectedIds.length+'장 삭제'}</button>}</div>}
    {!member?<p className="v3-status" onClick={openAccount}>로그인하면 수집한 카드가 나타나요. <button onClick={openAccount}>로그인하기</button></p>:cardTotal?<CardList/>:<div className="v3-empty-collection">아직 수집한 카드가 없어요.<br/>{dog.name}를 만나 첫 카드를 만들어보세요.</div>}</div>
   </>:loadingDogs?<p className="v3-status">도감을 불러오는 중…</p>:<p className="v3-error">도감을 찾지 못했어요.</p>}
   <Link href="/go" className="v3-return-link">← 내 도감으로 돌아가기</Link>
  </div>:<div className="v3-album-home">
    <section className="v3-profile-head"><div className="v3-profile-avatar"><img src={figmaSprite(member?.avatarDog||'구름')} alt="프로필 캐릭터"/></div><div><h1>{member?.nickname||'멍기록가'}</h1><p>멍기록가</p><small>{member?.profileBio||'자기소개가 없습니다.'}</small><Link href="/go/settings">› 프로필 수정</Link>{member&&<Link href={'/go/recorders/'+member.id}>› 내 프로필 미리보기</Link>}{!member&&<button className="v3-profile-login" onClick={openAccount}>› 로그인하고 시작하기</button>}</div></section>
    <section className="v3-collection-section"><h2>내 도감</h2><div className="v3-progress-label">도감 수집 {claimed} / {totalDogs}</div><div className="v3-progress"><span style={{width:(claimed/totalDogs*100)+'%'}}/></div>
     <div className="v3-collection-grid">{FIGMA_DOGS.map(name=>{const d=dogs.find(x=>x.name===name),owned=Boolean(d&&member&&(collection.counts?.[d.id]||0)>0);return <Link href={d?'/go/'+d.id:'/go'} className={'v3-collection-tile'+(owned?' unlocked':'')} key={name}><img src={figure(name,owned)} alt={owned?name:'미획득 실루엣'}/><strong>{name}</strong></Link>})}</div></section>
    <section className="v3-battle-home"><h2>멍배틀</h2><Link href="/go/battle" className="v3-battle-shortcut"><img src="/figma-v3/collar.png" alt="픽셀 목줄"/><strong>멍배틀 하러가기 ›</strong></Link><div className="v3-pixel-panel"><b>멍멍이별 대결 전적</b><p>{claimed?'나의 멍멍이 카드로 대결 기록을 쌓아보세요.':'멍배틀을 하고 기록을 쌓아보세요.'}</p></div></section>
    {member&&collection.progress?.complete&&!collection.progress.claimed&&<button className="v3-yellow-btn" onClick={claim} disabled={stampBusy}>도감 완성 스탬프 받기</button>}
    <div className="v3-album-links"><Link href="/go/community">모두의 도감 보기 ›</Link><Link href="/go/guide">게임 안내 ›</Link></div>
  </div>}
  {notice&&<p className="v3-message" role="status">{notice}</p>}{error&&<p className="v3-error" role="alert">{error}</p>}
  {camera&&<div className="v3-camera-backdrop" role="presentation"><section className="v3-camera-panel" role="dialog" aria-modal="true" aria-label="멍멍이 카드 촬영"><button className="v3-camera-close" onClick={()=>setCamera(null)} aria-label="카메라 닫기">×</button><GoCamera dog={camera} nickname={member?.nickname} standing={collection.standing} firstCard={!collection.counts?.[camera.id]} onSaved={()=>{reloadCards();reloadCollection();}} onDone={()=>setCamera(null)}/></section></div>}
 </>;
}
export default function GoPage({dogId=null}){return <GoShell active="album" albumDetail={Boolean(dogId)}><Album initialDogId={dogId}/></GoShell>}
