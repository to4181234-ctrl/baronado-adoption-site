'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import GoCardFace from './GoCardFace.js';
import {useGoSession} from './GoShell.js';
import {createBattleSound,BATTLE_SOUND_KEY} from '../lib/goBattleSound.js';
import {listenAudioSetting} from '../lib/goV3Audio.js';
import {vibrateBattleHit,stopBattleVibration} from '../lib/goBattleHaptics.js';
import {FRIEND_PVP_ANIMATION_MS,FRIEND_PVP_POLL_MS,
 roomSecondsRemaining,friendPvpOutcome,formatPvpScore} from '../lib/goPvpRules.js';
import './GoFriendBattle.css';

export const GO_STAGE5_UI_ENABLED =
 process.env.NEXT_PUBLIC_MEONGGO_STAGE1_COINS_ENABLED==='1' &&
 process.env.NEXT_PUBLIC_MEONGGO_STAGE2_OFFICIAL_ENABLED==='1' &&
 process.env.NEXT_PUBLIC_MEONGGO_STAGE5_PVP_ENABLED==='1';

const formatDate=value=>value?new Date(value).toLocaleString('ko-KR',{
 timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'
}):'';
const face=card=>({
 dogName:card?.dogName||'멍멍이',nickname:'멍기록가',
 imageUrl:card?.imageUrl||'',capturedAt:null,
 battle:{power:Number(card?.power)||0,charm:Number(card?.charm)||0}
});
const EMPTY={cards:[],total:0,hasMore:false};
function OwnedCard({card,selected,onClick}){
 return <button type="button" className={'friend-pvp-card'+(selected?' is-selected':'')}
  onClick={onClick} aria-pressed={selected}>
   <GoCardFace card={face(card)}/>
   <span>{card.dogName} · {card.title||'공식 멍카드'}</span>
   <small>파워 {card.power} · 매력 {card.charm}</small>
 </button>;
}
function MatchAnimation({state,impact}){
 const host=state.role==='host'?state.myCard:state.otherCard;
 const guest=state.role==='guest'?state.myCard:state.otherCard;
 return <div className={'meong-battle-versus is-battle-running'+(impact?' is-impact is-impact-'+impact:'')}
  aria-label="양측 멍카드 대결 연출">
  {[[host,'is-first'],[guest,'is-second']].map(([card,side])=>
   <div className={'meong-battle-fighter '+side} key={side}>
    {['ghost-long','ghost-far','ghost-near'].map(ghost=><div
      className={'meong-battle-ghost '+ghost} key={ghost} aria-hidden="true">
      <GoCardFace card={face(card)}/>
     </div>)}
    <div className="meong-battle-card is-mini"><GoCardFace card={face(card)}/></div>
   </div>)}
   <div className="v12-battle-impact" aria-hidden="true">
    {Array.from({length:12},(_,i)=><span key={i} style={{
      '--impact-angle':(i*30)+'deg','--impact-distance':(i%2?135:185)+'px'
    }}/>)}
   </div>
 </div>;
}
export default function GoFriendBattle(){
 const {member,ready,openAccount}=useGoSession();
 const [room,setRoom]=useState(null),[invite,setInvite]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [kind,setKind]=useState('camera'),[page,setPage]=useState(0);
 const [owned,setOwned]=useState(EMPTY),[loadingCards,setLoadingCards]=useState(false);
 const [history,setHistory]=useState({stats:{wins:0,draws:0,losses:0},recent:[]});
 const [animation,setAnimation]=useState('idle'),[impact,setImpact]=useState(0);
 const [now,setNow]=useState(0),[soundOn,setSoundOn]=useState(false);
 const audio=useRef(null),motionTimers=useRef([]),mutating=useRef(false),polling=useRef(false);
 const autoJoined=useRef(false),lastAnimated=useRef('');
 const selectedKey=x=>x?x.kind+':'+x.cardId+':'+(x.slot||''):null;

 const getHistory=useCallback(async()=>{
  if(!member)return;
  try{
   const r=await fetch('/api/go/pvp?mode=history',{cache:'no-store'});
   const d=await r.json();
   if(r.ok)setHistory(d);
  }catch{}
 },[member?.id]);
 useEffect(()=>{if(member)getHistory();},[member?.id,getHistory]);
 useEffect(()=>{
  audio.current=createBattleSound();
  const unsubscribe=listenAudioSetting(value=>setSoundOn(Boolean(value)));
  let enabled=true;
  try{enabled=localStorage.getItem(BATTLE_SOUND_KEY)!=='off';}catch{}
  setSoundOn(enabled);
  return()=>{unsubscribe();motionTimers.current.forEach(clearTimeout);
   stopBattleVibration();audio.current?.dispose();};
 },[]);
 useEffect(()=>audio.current?.setMuted(!soundOn),[soundOn]);
 useEffect(()=>{
  const clock=window.setInterval(()=>setNow(Date.now()),1000);
  return()=>window.clearInterval(clock);
 },[]);
 function applyResponse(data){
  if(!data?.ok)throw Error(data?.error||'대결 상태를 확인하지 못했어요.');
  if(data.roomId)setRoom(data);
  if(data.coinsAdded){
   window.dispatchEvent(new CustomEvent('go-coins-changed',{detail:{notified:false}}));
  }
 }
 async function request(body){
  const r=await fetch('/api/go/pvp',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
  const d=await r.json();
  if(!r.ok||!d.ok)throw Error(d.error||'대결 요청에 실패했어요.');
  return d;
 }
 async function mutate(body,{silent=false}={}){
  if(mutating.current)return null;
  mutating.current=true;
  if(!silent){setBusy(true);setError('');setNotice('');}
  try{
   const d=await request(body);
   if(body.action==='leave'){setRoom(null);window.history.replaceState(null,'','/go/battle');}
   else applyResponse(d);
   if(body.action==='create'||body.action==='join'){
    window.history.replaceState(null,'','/go/battle?room='+d.roomId);
   }
   if(['ready','unready','select','rematch'].includes(body.action))audio.current?.play('select');
   return d;
  }catch(e){if(!silent)setError(e.message);return null;}
  finally{mutating.current=false;if(!silent)setBusy(false);}
 }
 useEffect(()=>{
  if(!ready||!member||autoJoined.current)return;
  const param=new URLSearchParams(window.location.search).get('room');
  if(!param)return;
  autoJoined.current=true;mutate({action:'join',invite:param});
 },[ready,member?.id]);
 const roomId=room?.roomId;
 useEffect(()=>{
  if(!roomId||!member)return;
  let active=true;
  const sync=async()=>{
   if(document.visibilityState==='hidden'||mutating.current||polling.current||!active)return;
   polling.current=true;
   try{
    const result=await request({action:'sync',roomId});
    if(active&&!mutating.current)applyResponse(result);
   }catch(e){if(active)setError(e.message);}
   finally{polling.current=false;}
  };
  const timer=window.setInterval(sync,FRIEND_PVP_POLL_MS);
  const focus=()=>{if(document.visibilityState==='visible')sync();};
  document.addEventListener('visibilitychange',focus);
  return()=>{active=false;window.clearInterval(timer);
   document.removeEventListener('visibilitychange',focus);};
 },[roomId,member?.id]);
 useEffect(()=>{
  if(!member||room?.status!=='playing'||room.myReady)return;
  const ctrl=new AbortController();
  setLoadingCards(true);
  fetch('/api/go/pvp?'+new URLSearchParams({mode:'cards',kind,page:String(page)}),
   {cache:'no-store',signal:ctrl.signal})
    .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'멍카드를 불러오지 못했어요.');return d;})
    .then(d=>{if(!ctrl.signal.aborted)setOwned(d);})
    .catch(e=>{if(!ctrl.signal.aborted)setError(e.message);})
    .finally(()=>{if(!ctrl.signal.aborted)setLoadingCards(false);});
  return()=>ctrl.abort();
 },[member?.id,room?.status,room?.myReady,room?.round,kind,page]);
 useEffect(()=>{setPage(0);setKind('camera');},[room?.round]);
 useEffect(()=>{
  if(room?.status!=='completed')return;
  const key=room.roomId+':'+room.round;
  if(lastAnimated.current===key)return;
  lastAnimated.current=key;
  setAnimation('fight');setImpact(0);
  audio.current?.startMusic();audio.current?.play('start');
  const timers=motionTimers.current;
  for(const [level,at] of [[1,920],[2,1970],[3,3050]]){
   timers.push(window.setTimeout(()=>{
    setImpact(level);audio.current?.playImpact(level);vibrateBattleHit(level);
   },at));
   timers.push(window.setTimeout(()=>setImpact(0),at+260));
  }
  timers.push(window.setTimeout(()=>{
   setAnimation('result');setImpact(0);
   stopBattleVibration();audio.current?.stop();
   audio.current?.play(room.winner==='draw'?'draw':
    room.winner===room.role?'victory':'defeat');
  },FRIEND_PVP_ANIMATION_MS));
  getHistory();
  window.dispatchEvent(new CustomEvent('go-coins-changed',{detail:{notified:false}}));
  return()=>{timers.forEach(window.clearTimeout);motionTimers.current=[];stopBattleVibration();};
 },[room?.roomId,room?.round,room?.status]);
 function clearRoom(){
  setRoom(null);setNotice('');setError('');setAnimation('idle');setImpact(0);
  window.history.replaceState(null,'','/go/battle');
  getHistory();
 }
 async function copy(value){
  try{await navigator.clipboard.writeText(value);setNotice('초대 정보를 복사했어요.');}
  catch{window.prompt('초대 정보를 복사해주세요.',value);}
 }
 const inviteLink=roomId&&typeof window!=='undefined'?
  window.location.origin+'/go/battle?room='+roomId:'';
 const opponent=room?(room.role==='host'?room.guestName:room.hostName):'';
 const winner=room?.winner;
 const outcome=friendPvpOutcome(winner,room?.role);
 const remaining=room?.status==='waiting'?
  roomSecondsRemaining(room.inviteExpiresAt,now):room?.status==='playing'?
  roomSecondsRemaining(room.readyDeadline,now):0;
 const activeStats=room?.myStats||history.stats;
 return <div className="meong-battle-app friend-pvp" data-pvp-stage="5">
  <header className="friend-pvp-header">
   <h1>멍배틀</h1>
   <p className="meong-battle-hint">친구와 실시간으로 1:1 멍카드 배틀!</p>
   <p className="friend-pvp-rules">파워 + 매력으로 승패를 결정해요. 속성 상성 보너스는 없어요.</p>
  </header>
  {error&&<p className="meong-battle-error" role="alert">{error}</p>}
  {notice&&<p className="friend-pvp-notice" role="status">{notice}</p>}
  {!ready?<p role="status">계정을 확인하는 중…</p>:
   !member?<section className="meong-battle-login">
    <h2>친구와 함께 멍배틀!</h2>
    <p>로그인하고 출전할 멍카드를 한 장 이상 보유해야 해요.</p>
    <button onClick={openAccount}>로그인하고 시작하기</button>
   </section>:<>
   {!room&&<section className="friend-pvp-intro">
    <div className="friend-pvp-leader">
     <h2>내 누적 전적</h2><strong>{formatPvpScore(activeStats)}</strong>
     <small>친구에게는 누적 승·무·패만 보여요. 공개 순위표는 없어요.</small>
    </div>
    <button type="button" className="meong-battle-primary" disabled={busy}
     onClick={()=>mutate({action:'create'})}>{busy?'초대방 생성 중…':'친구 초대방 만들기'}</button>
    <form className="friend-pvp-join" onSubmit={e=>{e.preventDefault();
     if(invite.trim())mutate({action:'join',invite:invite.trim()});}}>
     <label htmlFor="pvp-code">친구에게 받은 초대 코드</label>
     <div><input id="pvp-code" value={invite} onChange={e=>setInvite(e.target.value)}
      maxLength={300} placeholder="12자리 초대 코드 또는 방 링크" autoComplete="off"/>
      <button type="submit" disabled={busy||!invite.trim()}>참가하기</button></div>
    </form>
    <p className="friend-pvp-help">초대는 30분 동안 유효하며, 참가 후에는 2분 안에 카드 준비를 완료해야 해요.</p>
    <Link href="/go">← 도감으로 돌아가기</Link>
   </section>}
   {room&&<section className="friend-pvp-room">
    <div className="friend-pvp-room-head">
     <div><strong>{room.status==='waiting'?'친구를 기다리는 중':
      room.status==='playing'?'멍카드 출전 준비':
      room.status==='completed'?'멍배틀 결과':'대결 종료'}</strong>
      <small>친구 대전 · {room.round}라운드</small>
     </div>
     {room.status!=='cancelled'&&<button type="button" disabled={busy}
      onClick={()=>{if(window.confirm('대결방을 나갈까요? 준비 중인 라운드는 기록되지 않아요.'))
       mutate({action:'leave',roomId:room.roomId}).then(result=>{if(result)clearRoom();});}}>방 나가기</button>}
    </div>
    <div className="friend-pvp-participants">
     <div><span>나</span><b>{room.role==='host'?room.hostName:room.guestName}</b>
      <small>{formatPvpScore(room.myStats)}</small></div>
     <strong aria-hidden="true">VS</strong>
     <div><span>친구</span><b>{opponent||'친구 대기'}</b>
      <small>{room.joined?formatPvpScore(room.otherStats):'초대 중…'}</small></div>
    </div>
    {room.status==='waiting'&&<div className="friend-pvp-invite">
     <p>친구에게 초대 링크나 코드를 보내주세요.</p>
     <label>초대 코드 <strong>{room.inviteCode}</strong></label>
     <div><button onClick={()=>copy(room.inviteCode)}>코드 복사</button>
      <button onClick={()=>copy(inviteLink)}>초대 링크 복사</button></div>
     <p>남은 초대 시간: {Math.ceil(remaining/60)}분</p>
    </div>}
    {room.status==='playing'&&<div className="friend-pvp-prepare">
     {room.otherConnected===false&&<div className="friend-pvp-reconnect" role="status">
      <strong>친구의 연결이 끊어졌어요.</strong>
      <p>같은 방에서 재접속을 기다리는 중이에요. 남은 시간: {roomSecondsRemaining(room.reconnectDeadline,now)}초</p>
      <p>연결되면 양쪽 모두 카드를 다시 준비해야 해요. 지금은 코인과 전적이 기록되지 않아요.</p>
     </div>}
     <p className="friend-pvp-clock">준비 남은 시간: <strong>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</strong></p>
     <div className="friend-pvp-ready-state">
      <span>나 {room.myReady?'✓ 준비 완료':room.mySelected?'카드 선택 완료':'카드 선택 전'}</span>
      <span>친구 {room.otherReady?'✓ 준비 완료':room.otherSelected?'카드 선택 완료':'카드 선택 전'}</span>
     </div>
     {room.myCard&&<div className="friend-pvp-current">
      <h2>선택한 멍카드</h2>
      <div><GoCardFace card={face(room.myCard)}/>
       <p>{room.myCard.dogName}<small>파워 {room.myCard.power} · 매력 {room.myCard.charm}</small></p></div>
     </div>}
     {!room.myReady&&<>
      <h2>내 카드 한 장 선택하기</h2>
      <div className="meong-battle-tabs">
       <button type="button" className={kind==='camera'?'active':''}
        onClick={()=>{setKind('camera');setPage(0);}}>나만의 카드</button>
       <button type="button" className={kind==='official'?'active':''}
        onClick={()=>{setKind('official');setPage(0);}}>공식 멍카드</button>
       <span>출전 1장</span>
      </div>
      {loadingCards?<p role="status">내 카드를 불러오는 중…</p>:
       owned.cards.length?<div className="friend-pvp-card-grid">{owned.cards.map(card=>
        <OwnedCard card={card} key={selectedKey(card)}
         selected={selectedKey(room.myCard)===selectedKey(card)}
         onClick={()=>mutate({action:'select',roomId:room.roomId,
          kind:card.kind,cardId:card.cardId,slot:card.slot})}/>)}</div>:
        <p className="meong-battle-empty">이 종류의 출전 카드가 없어요.
         <Link href="/go">도감에서 멍카드 모으기</Link></p>}
      {owned.total>12&&<div className="meong-battle-pager">
       <button disabled={page===0||busy} onClick={()=>setPage(p=>Math.max(0,p-1))}>이전</button>
       <span>{page+1}</span>
       <button disabled={!owned.hasMore||busy} onClick={()=>setPage(p=>p+1)}>다음</button>
      </div>}
      <button type="button" className="meong-battle-primary" disabled={busy||!room.mySelected||room.otherConnected===false}
       onClick={()=>mutate({action:'ready',roomId:room.roomId})}>
       준비 완료 · 상대와 동시 공개</button>
     </>}
     {room.myReady&&<div className="friend-pvp-ready-done">
      <p>준비 완료! 친구가 준비하면 두 카드가 동시에 공개돼요.</p>
      <button type="button" disabled={busy}
       onClick={()=>mutate({action:'unready',roomId:room.roomId})}>
       준비 취소하고 카드 바꾸기</button>
     </div>}
    </div>}
    {room.status==='completed'&&room.myCard&&room.otherCard&&
     <section className="friend-pvp-result" aria-live="polite">
      {animation==='fight'?<>
       <h2>두근두근, 멍배틀!</h2>
       <MatchAnimation state={room} impact={impact}/>
       <p>양쪽 출전 카드 공개!</p>
       <button type="button" className="meong-battle-secondary" onClick={()=>{
        motionTimers.current.forEach(clearTimeout);motionTimers.current=[];
        setAnimation('result');setImpact(0);stopBattleVibration();
       }}>결과 바로 보기</button>
      </>:<>
       <h2>{outcome==='win'?'승리!':outcome==='draw'?'무승부!':'아쉽게 패배!'}</h2>
       <div className="friend-pvp-result-cards">
        {[room.role==='host'?room.myCard:room.otherCard,
          room.role==='guest'?room.myCard:room.otherCard].map((card,i)=>
          <div key={i}><GoCardFace card={face(card)}/>
           <strong>{card.dogName}</strong></div>)}
       </div>
       <p className="friend-pvp-result-score">
        {room.hostName} {room.hostScore} : {room.guestScore} {room.guestName}
       </p>
       <p className="friend-pvp-result-note">파워 + 매력 합산 · 속성 보너스 0</p>
       <button type="button" className="meong-battle-primary"
        disabled={busy||room.myRematch}
        onClick={()=>mutate({action:'rematch',roomId:room.roomId})}>
        {room.myRematch?'친구의 재대결 동의 기다리는 중…':'같은 친구와 재대결 신청'}</button>
       {room.otherRematch&&!room.myRematch&&
        <p role="status">친구가 재대결을 신청했어요. 위 버튼으로 수락할 수 있어요.</p>}
       <button type="button" className="meong-battle-secondary"
        onClick={()=>mutate({action:'leave',roomId:room.roomId}).then(result=>{if(result)clearRoom();})}>
        대결 마치기</button>
      </>}
     </section>}
    {room.status==='cancelled'&&<div className="friend-pvp-cancelled">
     <h2>대결이 종료됐어요.</h2>
     <p>초대 만료, 준비 시간 초과 또는 30초 이상 연결이 끊어지면 라운드가 취소돼요. 취소된 라운드는 전적과 퀘스트에 반영되지 않아요.</p>
     <button className="meong-battle-primary" onClick={clearRoom}>새 배틀 시작</button>
    </div>}
   </section>}
   {!room&&<section className="friend-pvp-history">
    <h2>최근 멍배틀 기록</h2>
    {history.recent?.length?<ol>{history.recent.map((h,i)=><li key={i}>
      <strong>{h.outcome==='win'?'승':h.outcome==='draw'?'무':'패'}</strong>
      <span>{h.opponentName} 멍기록가</span>
      <small>{formatDate(h.finishedAt)}</small>
     </li>)}</ol>:<p>아직 대결 기록이 없어요.</p>}
    <small>최근 20경기만 표시해요. 기존 카드를 삭제해도 완료된 전적은 유지돼요.</small>
   </section>}
  </>}
 </div>;
}
