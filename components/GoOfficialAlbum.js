'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import GoCardFace from './GoCardFace.js';
import {useGoSession} from './GoShell.js';
import {useGoCoins} from './GoCoins.js';
import {enqueueGoCoinNotice} from '../lib/goCoinNotices.js';
export const GO_STAGE2_UI_ENABLED =
 process.env.NEXT_PUBLIC_MEONGGO_STAGE1_COINS_ENABLED==='1' &&
 process.env.NEXT_PUBLIC_MEONGGO_STAGE2_OFFICIAL_ENABLED==='1';
const EMPTY={dogs:[],drawUsed:false,pendingDuplicate:null};
const labels={all:'전체',available:'입양 전',adopted:'입양 완료'};
export default function GoOfficialAlbum({dogId=null}){
 const {member,ready,openAccount}=useGoSession();
 const coins=useGoCoins();
 const [catalog,setCatalog]=useState(EMPTY);
 const [filter,setFilter]=useState('all'),[order,setOrder]=useState('newest');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [result,setResult]=useState(null),[opened,setOpened]=useState(null),[pending,setPending]=useState(null),[hiddenDog,setHiddenDog]=useState(null);
 const [shopResult,setShopResult]=useState(null),[message,setMessage]=useState('');
 const purchaseRef=useRef(null);
 const refresh=useCallback(async()=>{
  if(!GO_STAGE2_UI_ENABLED)return;
  try{
   const response=await fetch('/api/go/official',{cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'공식 멍카드를 불러오지 못했어요.');
   setCatalog(data);setPending(data.pendingDuplicate);
   setError('');
  }catch(e){setError(e.message);}
  finally{setLoading(false);}
 },[member?.id]);
 useEffect(()=>{setLoading(true);refresh();},[refresh]);

 const selected=useMemo(()=>{
  let all=catalog.dogs||[];
  if(dogId)all=all.filter(d=>d.dogId===dogId);
  else if(filter!=='all')all=all.filter(d=>d.adopted===(filter==='adopted'));
  // Collected dogs before uncollected; no change to preexisting camera album order.
  return all.slice().sort((a,b)=>{
   const owned=Number(b.collected>0)-Number(a.collected>0);
   return owned||a.name.localeCompare(b.name,'ko')*(order==='oldest'?-1:1);
  });
 },[catalog.dogs,filter,order,dogId]);
 const activeDogs=(catalog.dogs||[]).filter(d=>!d.adopted);
 const activeHeld=activeDogs.reduce((n,d)=>n+d.collected,0);
 const activeTotal=activeDogs.length*5;
 const openCard=async(d,slot)=>{
  const card=d.slots.find(x=>x.slot===slot);
  if(!card?.owned)return;
  setOpened({dogId:d.dogId,slot});setMessage('');
  if(card.new){
   try{await fetch('/api/go/official',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({action:'seen',dogId:d.dogId,slot})});await refresh();}catch{}
  }
 };
 async function mutate(body){
  const r=await fetch('/api/go/official',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();
  if(!r.ok||!d.ok)throw Error(d.error||'멍카드를 처리하지 못했어요.');
  return d;
 }
 async function draw(){
  if(!member){openAccount();return;}
  if(busy||catalog.drawUsed)return;
  setBusy(true);setError('');setMessage('');
  try{
   const data=await mutate({action:'draw'});
   if(data.coinsAdded){enqueueGoCoinNotice(data.coinsAdded);
     window.dispatchEvent(new CustomEvent('go-coins-changed',{detail:{notified:true}}));}
   await refresh();
   setResult(data);
   if(data.requiresChoice)setPending({
    dogId:data.dogId,slot:data.slot,proposedPower:data.proposedPower,
    proposedCharm:data.proposedCharm
   });
   if(data.hiddenUnlocked)setHiddenDog(data.dogId);
  }catch(e){setError(e.message);}
  finally{setBusy(false);}
 }
 async function resolve(replace){
  if(!pending||busy)return;
  setBusy(true);setError('');
  try{
   const data=await mutate({action:'resolve',replace});
   setPending(null);
   setMessage(replace?'새 능력치로 교체했어요.':'기존 능력치를 유지했어요.');
   await refresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function buy(dog){
  if(!member){openAccount();return;}
  if(busy||!dog?.available||!dog.missing)return;
  if((coins?.balance??0)<200){setError('멍코인이 부족해요. 돌보기와 퀘스트로 코인을 모아보세요.');return;}
  if(!window.confirm(dog.name+'의 미보유 공식 사진 카드 1종을 200C로 구매할까요?'))return;
  setBusy(true);setError('');setMessage('');
  if(!purchaseRef.current||purchaseRef.current.dogId!==dog.dogId)
   purchaseRef.current={dogId:dog.dogId,requestId:crypto.randomUUID()};
  try{
   const r=await fetch('/api/go/official/shop',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(purchaseRef.current)});
   const data=await r.json();
   if(!r.ok||!data.ok)throw Error(data.error||'결과 확인에 실패했어요.');
   purchaseRef.current=null;
   setShopResult({dogId:dog.dogId,slot:data.slot,hiddenUnlocked:data.hiddenUnlocked});
   if(data.hiddenUnlocked)setHiddenDog(dog.dogId);
   if(data.coinsSpent)enqueueGoCoinNotice(-data.coinsSpent);
   window.dispatchEvent(new CustomEvent('go-coins-changed',{detail:{notified:!data.replayed}}));
   await refresh();
  }catch(e){setError(e.message+' 동일한 구매 요청으로 다시 확인할 수 있어요.');}
  finally{setBusy(false);}
 }
 async function peekHidden(){
  if(!hiddenDog)return;
  const dog=catalog.dogs.find(d=>d.dogId===hiddenDog);
  if(!dog?.hidden.unlocked)return;
  try{await mutate({action:'seen',dogId:hiddenDog,slot:6});await refresh();}catch{}
  setHiddenDog(null);setOpened({dogId:dog.dogId,slot:6});
 }
 const openedDog=(catalog.dogs||[]).find(d=>d.dogId===opened?.dogId);
 const openedData=opened?.slot===6?openedDog?.hidden:openedDog?.slots.find(s=>s.slot===opened?.slot);
 const newDog=selected.find(d=>d.dogId===result?.dogId);
 const completedDog=(catalog.dogs||[]).find(d=>d.dogId===hiddenDog);
 if(!GO_STAGE2_UI_ENABLED)return null;
 return <div className="go-official-album" aria-label="유기견 공식 멍카드 도감">
  {!dogId&&<header className="go-official-heading">
    <h2>유기견 도감</h2>
    <p>강아지별 공식 사진 5종을 모두 모으면 숨겨진 이야기가 열려요.</p>
    <div className="go-official-progress">
      <span>사진 수집 {activeHeld} / {activeTotal}</span>
      <b>{activeTotal?Math.round(activeHeld/activeTotal*100):0}%</b>
    </div>
    <div className="go-official-progress-bar"><span style={{width:(activeTotal?activeHeld/activeTotal*100:0)+'%'}}/></div>
    {member?<div className="go-official-draw">
      <span>오늘의 무료 뽑기 <small>하루 1회 · 첫 뽑기 퀘스트 +10C</small></span>
      <button type="button" disabled={busy||catalog.drawUsed||!catalog.dogs?.some(d=>d.available)}
        onClick={draw}>{busy?'처리 중…':catalog.drawUsed?'오늘 뽑기 완료':'무료 뽑기'}</button>
    </div>:<div className="go-official-draw"><span>로그인 후 공식 멍카드를 수집해 보세요.</span>
      <button type="button" onClick={openAccount}>로그인</button></div>}
  </header>}
  {!dogId&&<div className="go-official-filters">
    <nav aria-label="공식 도감 필터">{Object.entries(labels).map(([key,label])=>
      <button type="button" key={key} aria-pressed={filter===key}
        onClick={()=>setFilter(key)}>{label}</button>)}</nav>
    <select value={order} onChange={e=>setOrder(e.target.value)} aria-label="도감 정렬">
      <option value="newest">이름순</option><option value="oldest">이름 역순</option>
    </select>
  </div>}
  {error&&<div className="go-official-alert" role="alert">{error}
    <button type="button" onClick={refresh}>새로고침</button></div>}
  {message&&<p className="go-official-success" role="status">{message}</p>}
  {loading?<p role="status" className="go-official-empty">도감을 불러오는 중…</p>:
   selected.length===0?<p className="go-official-empty">
    {dogId?'아직 이 강아지의 공식 멍카드가 공개되지 않았어요.':'공개된 공식 멍카드가 아직 없어요.'}
   </p>:<div className="go-official-dogs">{selected.map(dog=>
    <section className="go-official-dog" key={dog.dogId}>
      <div className="go-official-dog-title"><div>
        <h3>{dog.name}{dog.adopted&&<small>입양 완료</small>}</h3>
        <p>공식 사진 {dog.collected} / 5종 {dog.paused&&'· 공개 중지'}</p>
      </div>
        <Link href={'/go/'+dog.dogId}>강아지 도감 ›</Link>
      </div>
      <div className="go-official-card-grid">{dog.slots.map(card=>
       card.owned?<button key={card.slot} type="button" className="go-official-card"
         onClick={()=>openCard(dog,card.slot)}
         aria-label={dog.name+' 공식 카드 '+card.slot+'번 열기'}>
          <GoCardFace card={{dogName:dog.name,nickname:'바로나도',imageUrl:card.imageUrl,
            battle:{power:card.power,charm:card.charm},title:card.title,
            capturedAt:card.acquiredAt}}/>
          {card.new&&<b className="go-official-new">NEW</b>}
          <small>{card.title}</small>
        </button>:<div key={card.slot} className="go-official-locked"
           aria-label={dog.name+' 미보유 카드 '+card.slot+'번'}>
           <span>?</span><small>{card.slot} / 5</small>
        </div>)}</div>
      <div className={'go-official-hidden '+(dog.hidden.unlocked?'is-open':'')}>
        <div className="go-official-hidden-art">
          {dog.hidden.unlocked&&dog.hidden.imageUrl?
            <button type="button" onClick={()=>setOpened({dogId:dog.dogId,slot:6})}>
              <img src={dog.hidden.imageUrl} alt={dog.name+' HIDDEN 특별 일러스트'}/>
              {dog.hidden.new&&<span className="go-official-new">NEW</span>}
            </button>:<span aria-hidden="true">HIDDEN ?</span>}
        </div>
        <div><strong>HIDDEN · 숨겨진 사생활</strong>
          <p>{dog.hidden.unlocked?'특별 일러스트 해금 완료':'공식 사진 5종 수집 시 무료 해금'}</p>
        </div>
      </div>
      {!dog.adopted&&<div className="go-official-shop">
        <div><strong>공식 멍카드 상점</strong><small>미보유 {dog.missing}종 · 1장 200C</small></div>
        <button type="button" disabled={busy||!member||!dog.available||dog.missing===0}
          onClick={()=>buy(dog)}>{dog.missing===0?'5종 수집 완료':!dog.available?'구매 중지':'200C로 구매하기'}</button>
      </div>}
    </section>)}</div>}
  {pending&&<div className="go-official-overlay" role="presentation"><section role="dialog" aria-modal="true" aria-label="중복 멍카드 능력치 선택" className="go-official-dialog">
    <h2>이미 가지고 있는 멍카드예요!</h2>
    <p>기존 능력치를 유지하거나 새 능력치로 교체할 수 있어요.</p>
    <div className="go-official-compare">
      <p>기존: 파워 {catalog.dogs.find(d=>d.dogId===pending.dogId)?.slots.find(s=>s.slot===pending.slot)?.power??'—'} · 매력 {catalog.dogs.find(d=>d.dogId===pending.dogId)?.slots.find(s=>s.slot===pending.slot)?.charm??'—'}</p>
      <p>새 제안: 파워 {pending.proposedPower} · 매력 {pending.proposedCharm}</p>
    </div>
    <div className="go-official-dialog-actions">
      <button disabled={busy} onClick={()=>resolve(false)}>기존 유지</button>
      <button disabled={busy} onClick={()=>resolve(true)}>새 능력치로 교체</button>
    </div>
  </section></div>}
  {result&&!pending&&<div className="go-official-overlay" role="presentation"><section role="dialog" aria-modal="true" aria-label="무료 뽑기 결과" className="go-official-dialog">
    <h2>{result.duplicate?'오늘의 멍카드!':'새로운 멍카드를 발견했어요!'}</h2>
    <p>{newDog?.name||'강아지'} · 공식 카드 {result.slot}번</p>
    {newDog?.slots.find(s=>s.slot===result.slot)?.imageUrl&&<img className="go-official-result-art"
       src={newDog.slots.find(s=>s.slot===result.slot).imageUrl} alt="이번에 뽑은 공식 카드"/>}
    <button type="button" onClick={()=>setResult(null)}>확인</button>
  </section></div>}
  {shopResult&&<div className="go-official-overlay" role="presentation"><section role="dialog" aria-modal="true" aria-label="멍카드 구매 결과" className="go-official-dialog">
    <h2>멍카드를 구매했어요!</h2>
    <p>공식 멍카드 {shopResult.slot}번 · 200C</p>
    <div className="go-official-dialog-actions">
      <button onClick={()=>setShopResult(null)}>확인</button>
      <button onClick={()=>{setShopResult(null);document.querySelector('.go-official-album')?.scrollIntoView({behavior:'smooth'});}}>도감에서 보기</button>
    </div>
  </section></div>}
  {completedDog&&!pending&&!result&&!shopResult&&<div className="go-official-overlay" role="presentation"><section role="dialog" aria-modal="true" aria-label="특별 일러스트 해금" className="go-official-dialog">
    <h2>{completedDog.name}의 숨겨진 사생활 발견!</h2>
    <p>멍카드 5종을 모은 당신에게만 특별 공개!</p>
    <button onClick={peekHidden}>살짝 엿보기</button>
  </section></div>}
  {openedDog&&openedData?.imageUrl&&<div className="go-official-overlay" role="presentation" onClick={()=>setOpened(null)}>
    <section role="dialog" aria-modal="true" aria-label="공식 멍카드 크게 보기" className="go-official-dialog" onClick={e=>e.stopPropagation()}>
      <button className="go-official-close" aria-label="닫기" onClick={()=>setOpened(null)}>×</button>
      <h2>{opened.slot===6?'HIDDEN · '+openedDog.name:openedData.title}</h2>
      {opened.slot===6?<img className="go-official-large-hidden" src={openedData.imageUrl} alt={openedDog.name+' 특별 일러스트'}/>:
       <div className="go-official-large-card"><GoCardFace card={{
        dogName:openedDog.name,nickname:'바로나도',imageUrl:openedData.imageUrl,
        capturedAt:openedData.acquiredAt,battle:{power:openedData.power,charm:openedData.charm}
       }}/></div>}
      {opened.slot===6&&<a className="go-official-download"
        href={'/api/go/official/hidden?dogId='+encodeURIComponent(openedDog.dogId)}>
        PNG 이미지 저장</a>}
    </section>
  </div>}
 </div>;
}
