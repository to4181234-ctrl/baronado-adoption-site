'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import GoOfficialDrawReveal from './GoOfficialDrawReveal.js';
import GoDuplicateCompare from './GoDuplicateCompare.js';
import GoPixelChoice from './GoPixelChoice.js';
import GoSoundToggle from './GoSoundToggle.js';
import {createGameAudio} from '../lib/goV3Audio.js';
import {useGoSession} from './GoShell.js';
import {useGoCoins} from './GoCoins.js';
import {enqueueGoCoinNotice} from '../lib/goCoinNotices.js';
import {availableStoreItems,availableStoreDogs,STORE_PRICES} from '../lib/goStore.js';
import {LockedOfficialCard} from './GoStage2OfficialCards.js';
import {figmaSprite} from '../lib/goV3Game.js';

const STAGE4=process.env.NEXT_PUBLIC_MEONGGO_STAGE4_STORE_ENABLED==='1';
const STORE_ART='/meonggo/store/meonggo_store_loop.svg';
const EMPTY={dogs:[],drawUsed:false,pendingDuplicate:null};
const keyFor=id=>'meonggo2:store-pending:'+id;
function getKnownPending(id){
 try{
  const item=JSON.parse(localStorage.getItem(keyFor(id))||'null');
  return item&&['random','specific'].includes(item.mode)&&
    typeof item.requestId==='string'&&item.requestId.length===36?item:null;
 }catch{return null;}
}
function cardFor(dog,slot){
 const card=dog?.slots?.find(v=>v.slot===slot);
 return {dogName:dog?.name||'강아지',nickname:'바로나도',title:card?.title||'공식 멍카드',
  imageUrl:card?.imageUrl||'',battle:{power:card?.power??1,charm:card?.charm??1},
  status:'approved',capturedAt:card?.acquiredAt||null,officialSlot:slot};
}
export default function GoStore(){
 const {member,ready,openAccount}=useGoSession();
 const coins=useGoCoins();
 const [catalog,setCatalog]=useState(EMPTY);
 const sound=useRef(null);
 useEffect(()=>{sound.current=createGameAudio();return()=>{sound.current?.dispose();sound.current=null;};},[]);
 const catalogRequestRef=useRef(0);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 const [selected,setSelected]=useState({mode:'random'}),[confirm,setConfirm]=useState(false);
 const [choiceOpen,setChoiceOpen]=useState(false),[collarChoice,setCollarChoice]=useState(null);
 const [dogPickerOpen,setDogPickerOpen]=useState(false),[pickerNotice,setPickerNotice]=useState('');
 const [pending,setPending]=useState(null);
 const [duplicate,setDuplicate]=useState(null);
 const [revealed,setRevealed]=useState(null);
 const items=useMemo(()=>availableStoreItems(catalog.dogs),[catalog.dogs]);
 const dogOptions=useMemo(()=>availableStoreDogs(catalog.dogs),[catalog.dogs]);
 const selectedDog=dogOptions.find(i=>i.dogId===selected.dogId);
 const balance=coins?.walletLoaded?coins.balance:null;
 const refresh=useCallback(async()=>{
  const request=++catalogRequestRef.current;
  if(!STAGE4){if(request===catalogRequestRef.current)setLoading(false);return null;}
  try{
   const r=await fetch('/api/go/official',{cache:'no-store'});
   const data=await r.json();
   if(!r.ok)throw Error(data.error||'공식 멍카드 목록을 불러오지 못했어요.');
   if(request!==catalogRequestRef.current)return null;
   setCatalog(data);
   setDuplicate(data.pendingDuplicate||null);
   setError('');return data;
  }catch(e){if(request===catalogRequestRef.current)setError(e.message);return null;}
  finally{if(request===catalogRequestRef.current)setLoading(false);}
 },[member?.id]);
 useEffect(()=>{
  setCatalog(EMPTY);setDuplicate(null);setRevealed(null);setConfirm(false);
  setChoiceOpen(false);setDogPickerOpen(false);setLoading(true);
  refresh();
  return()=>{catalogRequestRef.current++;};
 },[refresh]);
 useEffect(()=>{
  setPending(member?.id?getKnownPending(member.id):null);
 },[member?.id]);
 function announceCoins(delta){
  if(Number.isInteger(delta)&&delta!==0){
   enqueueGoCoinNotice(delta);
   window.dispatchEvent(new CustomEvent('go-coins-changed',{detail:{notified:true}}));
  }else window.dispatchEvent(new CustomEvent('go-coins-changed',{detail:{notified:false}}));
 }
 function cacheRequest(details){
  setPending(details);
  if(member?.id)try{localStorage.setItem(keyFor(member.id),JSON.stringify(details));}catch{}
 }
 function clearRequest(){
  setPending(null);
  if(member?.id)try{localStorage.removeItem(keyFor(member.id));}catch{}
 }
 async function storePost(details){
  const r=await fetch('/api/go/store',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(details)});
  const data=await r.json();
  if(!r.ok||!data.ok)throw Error(data.error||'구매가 완료됐는지 확인하지 못했어요.');
  return data;
 }
 async function showPurchased(data,wasRecovered=false){
  setConfirm(false);setMessage('');
  if(!wasRecovered&&data.coinsSpent>0)announceCoins(-data.coinsSpent);
  else announceCoins(0);
  const next=await refresh();
  if(!next)throw Error('구매 후 카드를 불러오지 못했어요.');
  const pendingChoice=next.pendingDuplicate;
  if(data.requiresChoice||pendingChoice){
   if(!pendingChoice)throw Error('결제는 완료되었지만 중복 카드 비교를 아직 불러오지 못했어요.');
   clearRequest();setDuplicate(pendingChoice);
   return;
  }
  clearRequest();
  const purchased={...data,card:cardFor(next.dogs?.find(d=>d.dogId===data.dogId),data.slot)};
  if(purchased.card.imageUrl)setRevealed(purchased.card);
  else setMessage('카드는 지급되었지만 이미지를 불러오지 못했어요. 내 도감에서 확인해주세요.');
 }
 async function buy(){
  if(!member){setConfirm(false);openAccount();return;}
  if(busy||pending||items.length===0)return;
  if(selected.mode==='specific'&&!selectedDog){
   setError('지정할 멍멍이를 선택해주세요.');setConfirm(false);return;
  }
  const price=STORE_PRICES[selected.mode];
  if(balance===null||balance<price){setError('멍코인이 부족하거나 잔액을 확인하지 못했어요.');setConfirm(false);return;}
  const details={mode:selected.mode,requestId:crypto.randomUUID()};
  if(selected.mode==='specific'){details.dogId=selected.dogId;}
  cacheRequest(details);
  setBusy(true);setError('');setMessage('');
  try{await showPurchased(await storePost(details));}
  catch(e){setConfirm(false);setError(e.message+' 이전 구매 결과 확인으로 중복 결제를 방지할 수 있어요.');}
  finally{setBusy(false);}
 }
 async function recover(retry=false){
  if(!member||!pending||busy)return;
  setBusy(true);setError('');
  try{
   if(!retry){
    const r=await fetch('/api/go/store?requestId='+encodeURIComponent(pending.requestId),{cache:'no-store'});
    const d=await r.json();
    if(!r.ok||!d.ok)throw Error(d.error||'이전 결제를 조회하지 못했어요.');
    if(d.found){
     if((d.mode&&d.mode!==pending.mode) ||
       (pending.mode==='specific' && d.dogId!==pending.dogId))
       throw Error('이전 거래의 구매 방식이 달라요. 관리자에게 문의해주세요.');
     await showPurchased({dogId:d.dogId,slot:d.slot,price:d.price,coinsSpent:0,requiresChoice:d.requiresChoice,choiceId:d.choiceId},true);
     return;
    }
    setMessage('이전 구매는 아직 확인되지 않았어요. 동일 요청 번호로 재시도할 수 있어요.');
   }else await showPurchased(await storePost(pending));
  }catch(e){setError(e.message);}
  finally{setBusy(false);}
 }
 async function resolveDuplicate(replace){
  if(!duplicate||busy)return;
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/go/official',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resolve',choiceId:duplicate.choiceId,replace})});
   const data=await r.json();
   if(!r.ok||!data.ok)throw Error(data.error||'능력치를 저장하지 못했어요.');
   setDuplicate(null);
   const next=await refresh();
   const card=cardFor(next?.dogs?.find(d=>d.dogId===duplicate.dogId),duplicate.slot);
   if(card.imageUrl)setRevealed(card);
   else setMessage(replace?'새 능력치로 교체했어요.':'기존 능력치를 유지했어요.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const cardsForDog=(catalog.dogs||[]).filter(d=>d.available);
 if(!STAGE4)return <p role="status">스토어는 전체 업데이트 이후 이용할 수 있어요.</p>;
 return <article className="s4-store">
  <Link className="s4-store-back" href="/go">← 돌아가기</Link>
  <h1>스토어</h1>
  <div className="s4-store-art">
   <img src={STORE_ART} width="390" height="225"
    alt="꼬맹이·카우가 카드를 주고받고 말랑이가 졸고 있는 멍멍GO 상점"/>
  </div>
  <div className="s4-store-dialogue" aria-label="말랑이의 상점 안내">
   <img className="s4-store-dialogue-bg" src="/meonggo/store/dialogue-bg.svg" alt="" aria-hidden="true"/>
   <img className="s4-store-dialogue-outer" src="/meonggo/store/dialogue-outer.svg" alt="" aria-hidden="true"/>
   <img className="s4-store-dialogue-inner" src="/meonggo/store/dialogue-inner.svg" alt="" aria-hidden="true"/>
   <div className="s4-store-dialogue-copy"><strong>말랑이</strong>
    <p>한 번 골라봐..하암...졸리다</p></div>
  </div>
  {message&&<p role="status" className="s4-store-message">{message}</p>}
  {error&&<p role="alert" className="s4-store-error">{error} <button type="button" onClick={refresh}>다시 확인</button></p>}
  <section className="s4-store-products">
   <header className="s4-store-screen-reader"><h2>멍카드 구매</h2><p>랜덤은 공개된 모든 강아지의 일반 카드에서, 지정은 선택한 강아지의 일반 카드에서 뽑아요. 중복 카드도 나올 수 있어요.</p></header>
   <div className="s4-store-choices" role="group" aria-label="구매 방식">
    <button type="button"
     onClick={()=>{setSelected({mode:'random'});setCollarChoice(null);setChoiceOpen(true);}}>
      <LockedOfficialCard slot={1} storePreview/>
      <strong>랜덤 카드 뽑기</strong>
      <small>랜덤으로 멍카드를<br/>뽑을 수 있다.</small>
      <b>60 멍코인</b>
    </button>
    <button type="button"
     onClick={()=>{setSelected({mode:'specific'});setPickerNotice('');setDogPickerOpen(true);}}>
      <LockedOfficialCard slot={1} storePreview/>
      <strong>지정 랜덤 카드 뽑기</strong>
      <small>내가 지정한 멍멍이로<br/>랜덤 멍카드를 뽑을 수 있다.</small>
      <b>100 멍코인</b>
    </button>
   </div>
   {pending&&<aside className="s4-store-pending" role="status">
    <p>확인되지 않은 이전 구매가 있어요. 새로운 구매 전 결과를 확인해주세요.</p>
    <button type="button" disabled={busy} onClick={()=>recover(false)}>이전 구매 결과 확인</button>
    <button type="button" disabled={busy} onClick={()=>recover(true)}>같은 요청으로 재시도</button>
   </aside>}
  </section>
  {dogPickerOpen&&<div className="s4-store-overlay" role="presentation" onClick={()=>setDogPickerOpen(false)}>
   <section role="dialog" aria-modal="true" aria-label="지정할 강아지 선택" onClick={e=>e.stopPropagation()}>
    <button className="s4-store-close" onClick={()=>setDogPickerOpen(false)} aria-label="닫기">×</button>
    <h2>어떤 멍멍이로 뽑을까요?</h2>
    <p>선택한 멍멍이의 일반 카드 중 한 장이 나와요. 이미 보유한 카드도 나올 수 있어요.</p>
    {dogOptions.length===0?<p>현재 선택 가능한 입양 전 강아지가 없어요.</p>:
      <div className="s4-store-dog-choices">{dogOptions.map(dog=>
       <button type="button" key={dog.dogId} onClick={()=>{
        setSelected({mode:'specific',dogId:dog.dogId});setDogPickerOpen(false);
        setPickerNotice('');setConfirm(true);
       }} className="s4-store-dog-tile" aria-label={dog.name+(dog.missing===0?' 공식 카드 4종 수집 완료':' 미보유 공식 카드 '+dog.missing+'종')}>
        <img className={dog.hasAnyCard?'':'s4-store-dog-silhouette'}
         src={dog.hasAnyCard?(dog.thumbnailUrl||figmaSprite(dog.name,'front')):(dog.thumbnailUrl||figmaSprite(dog.name,'shadow'))}
         alt={dog.hasAnyCard?dog.name:'아직 수집하지 못한 '+dog.name+' 실루엣'}/>
         <span>{dog.name}</span></button>)}</div>}
     {pickerNotice&&<p role="status" className="s4-store-picker-notice">{pickerNotice}</p>}
   </section>
  </div>}
  {choiceOpen&&<div className="s4-store-overlay" role="presentation" onClick={()=>setChoiceOpen(false)}>
   <section className="s4-store-original-choice" role="dialog" aria-modal="true" aria-label="멍카드 목줄 선택"
     onClick={e=>e.stopPropagation()}>
    <button className="s4-store-close" onClick={()=>setChoiceOpen(false)} aria-label="닫기">×</button>
    <h2>랜덤 뽑기</h2>
    <div className="s4-store-collars">{[0,1,2].map(i=>
      <button type="button" key={i} aria-label={'목줄 '+(i+1)+' 선택'}
       aria-pressed={collarChoice===i} onClick={()=>{setCollarChoice(i);void sound.current?.play('collar');}}>
       <img src="/figma-v3/collar.png" alt="픽셀 목줄"/>
      </button>)}</div>
    <div className="s4-store-pixel-dialogue" aria-label="목줄 선택 안내"><img src="/figma-v3/discovery-dialog-bg.svg" alt=""/><img src="/figma-v3/discovery-dialog-outer.svg" alt=""/><img src="/figma-v3/discovery-dialog-inner.svg" alt=""/><p>오늘의 멍멍이는 누구일까요?</p></div>
    <GoSoundToggle className="s4-store-sound-icon"/>
    <div className="s4-store-collar-actions">
     <GoPixelChoice initial disabled={collarChoice===null}
       onClick={()=>{if(collarChoice===null)return;setChoiceOpen(false);setConfirm(true);}}>하나 고른다</GoPixelChoice>
     <GoPixelChoice onClick={()=>setChoiceOpen(false)}>도망간다</GoPixelChoice>
    </div>
   </section>
  </div>}
  {confirm&&<div className="s4-store-overlay s4-store-confirm-overlay" role="presentation" onClick={()=>setConfirm(false)}>
   <section className="s4-store-original-confirm" role="dialog" aria-modal="true" aria-label="멍카드 구매 최종 확인"
     onClick={e=>e.stopPropagation()}>
    <button className="s4-store-close" onClick={()=>setConfirm(false)} aria-label="닫기">×</button>
    <p className="s4-store-confirm-question">{STORE_PRICES[selected.mode]} 멍코인을 사용하여<br/>구매하시겠습니까?</p>
    <div className="s4-store-confirm-answers">
     <button type="button" disabled={busy} onClick={buy}>{busy?'처리 중…':'네'}</button>
     <button type="button" disabled={busy} onClick={()=>setConfirm(false)}>아니오</button>
    </div>
   </section>
  </div>}
  {duplicate&&<GoDuplicateCompare
   dog={catalog.dogs.find(d=>d.dogId===duplicate.dogId)} duplicate={duplicate}
   busy={busy} error={error} onResolve={resolveDuplicate} onClose={()=>resolveDuplicate(false)}/>}
  {revealed&&revealed.imageUrl&&<GoOfficialDrawReveal card={revealed} onClose={()=>setRevealed(null)}/>}
 </article>;
}
