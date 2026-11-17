'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import GoCompletion from './GoCompletion.js';
import GoPixelChoice from './GoPixelChoice.js';
import {useGoSession} from './GoShell.js';
import {useGoCoins} from './GoCoins.js';
import {enqueueGoCoinNotice} from '../lib/goCoinNotices.js';
import {availableStoreItems,availableStoreDogs,STORE_PRICES} from '../lib/goStore.js';
import {LockedOfficialCard} from './GoStage2OfficialCards.js';

const STAGE4=process.env.NEXT_PUBLIC_MEONGGO_STAGE4_STORE_ENABLED==='1';
const STORE_ART='/meonggo/store/meonggo_store_loop.svg';
const STILL_ART='/meonggo/store/meonggo_store_still.svg';
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
  status:'approved',capturedAt:card?.acquiredAt||null};
}
export default function GoStore(){
 const {member,ready,openAccount}=useGoSession();
 const coins=useGoCoins();
 const [catalog,setCatalog]=useState(EMPTY);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 const [selected,setSelected]=useState({mode:'random'}),[confirm,setConfirm]=useState(false);
 const [choiceOpen,setChoiceOpen]=useState(false),[collarChoice,setCollarChoice]=useState(null);
 const [dogPickerOpen,setDogPickerOpen]=useState(false);
 const [pending,setPending]=useState(null),[result,setResult]=useState(null);
 const [drawResult,setDrawResult]=useState(null),[duplicate,setDuplicate]=useState(null);
 const [revealed,setRevealed]=useState(null),[animating,setAnimating]=useState(true);
 const items=useMemo(()=>availableStoreItems(catalog.dogs),[catalog.dogs]);
 const dogOptions=useMemo(()=>availableStoreDogs(catalog.dogs),[catalog.dogs]);
 const selectedDog=dogOptions.find(i=>i.dogId===selected.dogId);
 const balance=coins?.walletLoaded?coins.balance:null;
 const refresh=useCallback(async()=>{
  if(!STAGE4){setLoading(false);return null;}
  try{
   const r=await fetch('/api/go/official',{cache:'no-store'});
   const data=await r.json();
   if(!r.ok)throw Error(data.error||'공식 멍카드 목록을 불러오지 못했어요.');
   setCatalog(data);
   if(data.pendingDuplicate){
    setDuplicate(data.pendingDuplicate);
    setDrawResult({dogId:data.pendingDuplicate.dogId,slot:data.pendingDuplicate.slot,requiresChoice:true});
   }
   setError('');return data;
  }catch(e){setError(e.message);return null;}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{refresh();},[refresh]);
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
  clearRequest();setConfirm(false);setMessage('구매한 카드는 내 도감에 저장됐어요. 연출을 건너뛰어도 환불되지 않아요.');
  if(!wasRecovered&&data.coinsSpent>0)announceCoins(-data.coinsSpent);
  else announceCoins(0);
  const next=await refresh();
  setResult({...data,card:cardFor(next?.dogs?.find(d=>d.dogId===data.dogId),data.slot)});
 }
 async function buy(){
  if(!member){setConfirm(false);openAccount();return;}
  if(busy||pending||items.length===0)return;
  if(selected.mode==='specific'&&!selectedDog){
   setError('미보유 공식 멍카드가 남아 있는 강아지를 선택해주세요.');setConfirm(false);return;
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
     if(d.mode!==pending.mode || d.price!==STORE_PRICES[pending.mode] ||
       (pending.mode==='specific' && d.dogId!==pending.dogId))
       throw Error('이전 거래의 구매 방식이 달라요. 관리자에게 문의해주세요.');
     await showPurchased({dogId:d.dogId,slot:d.slot,price:d.price,coinsSpent:0},true);
     return;
    }
    setMessage('이전 구매는 아직 확인되지 않았어요. 동일 요청 번호로 재시도할 수 있어요.');
   }else await showPurchased(await storePost(pending));
  }catch(e){setError(e.message);}
  finally{setBusy(false);}
 }
 async function freeDraw(){
  if(!member){openAccount();return;}
  if(busy||catalog.drawUsed)return;
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/go/official',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'draw'})});
   const data=await r.json();
   if(!r.ok||!data.ok)throw Error(data.error||'무료 멍카드 뽑기에 실패했어요.');
   if(data.coinsAdded)announceCoins(data.coinsAdded);
   const next=await refresh();
   setDrawResult({...data,card:cardFor(next?.dogs?.find(d=>d.dogId===data.dogId),data.slot)});
   if(data.requiresChoice)setDuplicate({dogId:data.dogId,slot:data.slot,
    proposedPower:data.proposedPower,proposedCharm:data.proposedCharm});
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function resolveDuplicate(replace){
  if(!duplicate||busy)return;
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/go/official',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resolve',replace})});
   const data=await r.json();
   if(!r.ok||!data.ok)throw Error(data.error||'능력치를 저장하지 못했어요.');
   setDuplicate(null);
   const next=await refresh();
   setDrawResult(p=>({...p,card:cardFor(next?.dogs?.find(d=>d.dogId===(p?.dogId||duplicate.dogId)),p?.slot||duplicate.slot)}));
   setMessage(replace?'새 능력치로 교체했어요.':'기존 능력치를 유지했어요.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const showAnimation=animating?STORE_ART:STILL_ART;
 const cardsForDog=(catalog.dogs||[]).filter(d=>d.available);
 if(!STAGE4)return <p role="status">스토어는 전체 업데이트 이후 이용할 수 있어요.</p>;
 return <article className="s4-store">
  <Link className="s4-store-back" href="/go">← 돌아가기</Link>
  <h1>스토어</h1>
  <div className="s4-store-art">
   <img src={showAnimation} width="390" height="225"
    alt="꼬맹이·카우가 카드를 주고받고 말랑이가 졸고 있는 멍멍GO 상점"/>
   <button type="button" onClick={()=>setAnimating(x=>!x)} aria-pressed={animating}>
    {animating?'움직임 멈추기':'움직임 재생'}
   </button>
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
  <div className="s4-store-wallet"><span>보유 멍코인</span><b>{member?(balance===null?'조회 중':balance+'C'):'로그인 후 확인'}</b></div>
  <section className="s4-store-draw">
   <header><h2>오늘의 무료 멍카드</h2><small>하루 1번 · 자정 초기화</small></header>
   <p>소개 팝업과 별개로, 공식 멍카드를 하루 한 번 뽑을 수 있어요.</p>
   <button type="button" disabled={busy||loading||catalog.drawUsed||!cardsForDog.length}
    onClick={freeDraw}>{catalog.drawUsed?'오늘 뽑기 완료':busy?'처리 중…':'무료 뽑기'}</button>
  </section>
  <section className="s4-store-products">
   <header className="s4-store-screen-reader"><h2>멍카드 구매</h2><p>랜덤은 모든 강아지의 미보유 카드에서, 지정은 선택한 강아지의 미보유 카드에서 랜덤 뽑기예요.</p></header>
   <div className="s4-store-choices" role="group" aria-label="구매 방식">
    <button type="button" aria-pressed={selected.mode==='random'}
     onClick={()=>{setSelected({mode:'random'});setCollarChoice(null);setChoiceOpen(true);}}>
      <LockedOfficialCard slot={1}/>
      <strong>카드 랜덤 뽑기</strong>
      <small>미보유 카드중 랜덤으로<br/>멍카드를 뽑을 수 있다.</small>
      <b>200 멍코인</b>
    </button>
    <button type="button" aria-pressed={selected.mode==='specific'}
     onClick={()=>{setSelected({mode:'specific'});setDogPickerOpen(true);}}>
      <LockedOfficialCard slot={1}/>
      <strong>카드 지정 랜덤 뽑기</strong>
      <small>내가 지정한 멍멍이로<br/>랜덤 멍카드를 뽑을 수 있다.</small>
      <b>300 멍코인</b>
    </button>
   </div>
   {loading?<p role="status">판매 가능한 멍카드를 불러오는 중…</p>:
    items.length===0?<p>현재 구매할 수 있는 미보유 공식 멍카드가 없어요.</p>:
    selected.mode==='specific'&&<div className="s4-store-dog-list">
      <p>어떤 멍멍이의 카드를 뽑을까요?</p>
      <div className="s4-store-dog-choices">
      {dogOptions.map(dog=>
        <button key={dog.dogId} type="button" aria-pressed={selected.dogId===dog.dogId}
          onClick={()=>setSelected({mode:'specific',dogId:dog.dogId})}>
          {dog.name} <small>미보유 {dog.missing}종</small>
        </button>)}
      </div>
    </div>}

   {pending&&<aside className="s4-store-pending" role="status">
    <p>확인되지 않은 이전 구매가 있어요. 새로운 구매 전 결과를 확인해주세요.</p>
    <button type="button" disabled={busy} onClick={()=>recover(false)}>이전 구매 결과 확인</button>
    <button type="button" disabled={busy} onClick={()=>recover(true)}>같은 요청으로 재시도</button>
   </aside>}
   <button className="s4-store-buy" type="button"
    disabled={busy||loading||!items.length||Boolean(pending)||selected.mode==='specific'&&!selectedDog}
    onClick={()=>{setCollarChoice(null);setChoiceOpen(true);setError('');}}>
    {selected.mode==='random'?'200C 랜덤 뽑기':'300C 강아지 지정 뽑기'}
   </button>
   <Link className="s4-store-run" href="/go">도망간다 · 내 도감으로</Link>
  </section>
  {dogPickerOpen&&<div className="s4-store-overlay" role="presentation" onClick={()=>setDogPickerOpen(false)}>
   <section role="dialog" aria-modal="true" aria-label="지정할 강아지 선택" onClick={e=>e.stopPropagation()}>
    <button className="s4-store-close" onClick={()=>setDogPickerOpen(false)} aria-label="닫기">×</button>
    <h2>어떤 멍멍이로 뽑을까요?</h2>
    <p>선택한 멍멍이의 미보유 공식 카드 중 1장이 무작위로 나와요.</p>
    {dogOptions.length===0?<p>지금 선택할 수 있는 미보유 공식 멍카드가 없어요.</p>:
     <div className="s4-store-dog-choices">{dogOptions.map(dog=>
      <button type="button" key={dog.dogId} onClick={()=>{
       setSelected({mode:'specific',dogId:dog.dogId});setDogPickerOpen(false);
       setCollarChoice(null);setChoiceOpen(true);
      }}>{dog.name}<small>미보유 {dog.missing}종</small></button>)}</div>}
    <button type="button" className="s4-store-run" onClick={()=>setDogPickerOpen(false)}>도망간다</button>
   </section>
  </div>}
  {choiceOpen&&<div className="s4-store-overlay" role="presentation" onClick={()=>setChoiceOpen(false)}>
   <section role="dialog" aria-modal="true" aria-label="멍카드 목줄 선택"
     onClick={e=>e.stopPropagation()}>
    <button className="s4-store-close" onClick={()=>setChoiceOpen(false)} aria-label="닫기">×</button>
    <h2>어떤 목줄을 고를까요?</h2>
    <p>목줄을 고르는 동안에는 코인이 차감되지 않아요.</p>
    <div className="s4-store-collars">{[0,1,2].map(i=>
      <button type="button" key={i} aria-label={'목줄 '+(i+1)+' 선택'}
       aria-pressed={collarChoice===i} onClick={()=>setCollarChoice(i)}>
       <img src="/figma-v3/collar.png" alt="픽셀 목줄"/>
      </button>)}</div>
    <div className="s4-store-collar-actions">
     <GoPixelChoice initial disabled={collarChoice===null}
       onClick={()=>{if(collarChoice===null)return;setChoiceOpen(false);setConfirm(true);}}>하나 고른다</GoPixelChoice>
     <GoPixelChoice onClick={()=>setChoiceOpen(false)}>도망간다</GoPixelChoice>
    </div>
   </section>
  </div>}
  {confirm&&<div className="s4-store-overlay" role="presentation" onClick={()=>setConfirm(false)}>
   <section role="dialog" aria-modal="true" aria-label="멍카드 구매 최종 확인"
     onClick={e=>e.stopPropagation()}>
    <button className="s4-store-close" onClick={()=>setConfirm(false)} aria-label="닫기">×</button>
    <h2>정말 구매할까요?</h2>
    <p>{selected.mode==='random'?'미보유 공식 멍카드 1장을 무작위로 구매해요.':
      (selectedDog?.name||'강아지')+'의 미보유 카드 중 1장을 무작위로 뽑아요.'}</p>
    <strong>{STORE_PRICES[selected.mode]}C</strong>
    <p>‘네’를 누르면 코인이 차감되고 카드가 지급돼요.</p>
    <div className="s4-store-actions"><button disabled={busy} onClick={()=>setConfirm(false)}>아니오</button>
     <button disabled={busy} onClick={buy}>{busy?'처리 중…':'네'}</button></div>
   </section>
  </div>}
  {duplicate&&<div className="s4-store-overlay" role="presentation">
   <section role="dialog" aria-modal="true" aria-label="중복 멍카드 능력치 선택">
    <h2>이미 가지고 있는 카드예요!</h2>
    <p>기존 능력치를 유지하거나 새 능력치를 선택해주세요.</p>
    <p>기존 파워 {catalog.dogs.find(d=>d.dogId===duplicate.dogId)?.slots.find(c=>c.slot===duplicate.slot)?.power??'—'} · 기존 애교 {catalog.dogs.find(d=>d.dogId===duplicate.dogId)?.slots.find(c=>c.slot===duplicate.slot)?.charm??'—'}</p>
    <p>새 파워 {duplicate.proposedPower} · 새 애교 {duplicate.proposedCharm}</p>
    <div className="s4-store-actions"><button disabled={busy} onClick={()=>resolveDuplicate(false)}>기존 유지</button>
     <button disabled={busy} onClick={()=>resolveDuplicate(true)}>새 능력치로 교체</button></div>
   </section>
  </div>}
  {drawResult&&!duplicate&&<div className="s4-store-overlay" role="presentation">
   <section role="dialog" aria-modal="true" aria-label="무료 멍카드 결과">
    <h2>오늘의 멍카드!</h2>
    <p>{catalog.dogs.find(d=>d.dogId===drawResult.dogId)?.name||'강아지'} · NO.{drawResult.slot}</p>
    <p>공식 멍카드는 내 도감에 저장됐어요.</p>
    <button type="button" onClick={()=>{setRevealed(drawResult.card);setDrawResult(null);}}>카드 보기</button>
    <button type="button" onClick={()=>setDrawResult(null)}>결과 닫기</button>
   </section>
  </div>}
  {result&&<div className="s4-store-overlay" role="presentation">
   <section role="dialog" aria-modal="true" aria-label="멍카드 구매 완료">
    <h2>카드 구매 완료!</h2><p>NO.{result.slot} · {catalog.dogs.find(d=>d.dogId===result.dogId)?.name||'강아지'}</p>
    <p>지급이 완료된 카드예요. 연출을 건너뛰어도 환불되지 않아요.</p>
    <div className="s4-store-actions">
     <button type="button" onClick={()=>{setResult(null);setRevealed(result.card);}}>카드 연출 보기</button>
     <button type="button" onClick={()=>setResult(null)}>SKIP · 내 도감에 저장됨</button>
    </div>
   </section>
  </div>}
  {revealed&&revealed.imageUrl&&<GoCompletion viewOnly card={revealed}
    viewerActions={<Link className="go-primary" href="/go" onClick={()=>setRevealed(null)}>내 도감에서 보기</Link>}
    onDone={()=>setRevealed(null)}/>}
 </article>;
}
