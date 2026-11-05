'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import GoShell,{useGoSession} from './GoShell.js';
import {listenAudioSetting} from '../lib/goV3Audio.js';
import {createBattleSound,BATTLE_SOUND_KEY} from '../lib/goBattleSound.js';
import './GoBattle.css';
import GoCardFace from './GoCardFace.js';
import GoElementSparkles,{elementForCard} from './GoElementSparkles.js';
import {vibrateBattleHit,stopBattleVibration} from '../lib/goBattleHaptics.js';
import {figmaSprite,FIGMA_DOGS} from '../lib/goV3Game.js';

const initial={cards:[],hasMore:false,total:0,eligibleDogKinds:0};
const emptyOpponents={members:[],total:0,hasMore:false};
function BattleCard({card,selected,onSelect,disabled=false,mini=false}){
 return <button type="button" className={'meong-battle-card'+(selected?' is-picked':'')+(mini?' is-mini':'')} onClick={onSelect} disabled={disabled||!onSelect} aria-pressed={Boolean(selected)}>
  <GoCardFace card={card}/>{selected&&<span className="meong-card-selected">✓</span>}
 </button>;
}
function Game(){
 const {member,ready,openAccount}=useGoSession();
 const [query,setQuery]=useState(''),[searched,setSearched]=useState('');
 const [order,setOrder]=useState('newest'),[page,setPage]=useState(0);
 const [data,setData]=useState(initial),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [selected,setSelected]=useState([]),[phase,setPhase]=useState('choose');
 const [opponents,setOpponents]=useState(emptyOpponents),[opponent,setOpponent]=useState(null);
 const [randomOpponent,setRandomOpponent]=useState(false),[opponentPage,setOpponentPage]=useState(0);
 const [revealStage,setRevealStage]=useState('shuffle'),[revealed,setRevealed]=useState(false),[slotName,setSlotName]=useState('');
 const [opponentBusy,setOpponentBusy]=useState(false);
 const [impactBeat,setImpactBeat]=useState(0),[result,setResult]=useState(null),[mutating,setMutating]=useState(false);
 const [soundEnabled,setSoundEnabled]=useState(false),[soundReady,setSoundReady]=useState(false);
 const sounds=useRef(null),timers=useRef([]),requestId=useRef(null),preparedId=useRef(null),preparedToken=useRef(null),finished=useRef(false),alive=useRef(true);
 const stop=useCallback(()=>{timers.current.forEach(clearTimeout);timers.current=[];sounds.current?.stop();stopBattleVibration();},[]);
 useEffect(()=>{alive.current=true;sounds.current=createBattleSound();const unsubscribe=listenAudioSetting(setSoundEnabled);setSoundEnabled(localStorage.getItem(BATTLE_SOUND_KEY)!=='off');setSoundReady(true);const hidden=()=>{if(document.hidden)sounds.current?.stop();};document.addEventListener('visibilitychange',hidden);return()=>{alive.current=false;unsubscribe();stop();sounds.current?.dispose();document.removeEventListener('visibilitychange',hidden);};},[stop]);
 useEffect(()=>{if(soundReady)sounds.current?.setMuted(!soundEnabled);},[soundEnabled,soundReady]);
 useEffect(()=>{
  if(!ready||!member||phase!=='choose'){return;}
  const ctl=new AbortController();setLoading(true);setError('');
  const qs=new URLSearchParams({mine:'1',q:searched,order,page:String(page)});
  fetch('/api/go/battle?'+qs,{cache:'no-store',signal:ctl.signal})
   .then(r=>r.json().then(j=>{if(!r.ok)throw Error(j.error||'카드를 불러오지 못했어요.');return j;}))
   .then(setData).catch(e=>{if(!ctl.signal.aborted)setError(e.message);})
   .finally(()=>{if(!ctl.signal.aborted)setLoading(false);});
  return()=>ctl.abort();
 },[ready,member?.id,phase,searched,order,page]);
 useEffect(()=>{
  if(!ready||!member||phase!=='opponents'||!selected[0])return;
  const ctl=new AbortController();setLoading(true);setError('');
  const qs=new URLSearchParams({mode:'opponents',ownCardId:selected[0].id,q:searched,page:String(opponentPage)});
  fetch('/api/go/battle?'+qs,{cache:'no-store',signal:ctl.signal})
   .then(r=>r.json().then(j=>{if(!r.ok)throw Error(j.error||'상대 목록을 불러오지 못했어요.');return j;}))
   .then(setOpponents).catch(e=>{if(!ctl.signal.aborted)setError(e.message);})
   .finally(()=>{if(!ctl.signal.aborted)setLoading(false);});
  return()=>ctl.abort();
 },[ready,member?.id,phase,selected[0]?.id,searched,opponentPage]);
 const choose=card=>{
  if(phase!=='choose')return;
  if(!card.battle||card.status!=='approved'){setError('배틀 가능한 멍카드를 선택해주세요.');return;}
  if(card.ownerId!==member?.id){setError('내 카드만 선택할 수 있어요.');return;}
  setSelected([card]);setError('');sounds.current?.play('select');
 };
 const goOpponents=()=>{
  if(selected.length!==1)return;
  setSearched('');setQuery('');setOpponentPage(0);setPhase('opponents');setError('');
 };
 const prepare=async(id=null,random=false)=>{
  if(!selected[0]||opponentBusy)return;
  stop();finished.current=false;requestId.current=null;preparedId.current=null;preparedToken.current=null;
  setImpactBeat(0);setOpponentBusy(true);setError('');
  try{
   const response=await fetch('/api/go/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepare',firstId:selected[0].id,opponentId:id,randomMember:random})});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||'상대 카드를 선정하지 못했어요.');
   if(!body.battleId||!body.matchToken||!body.card||!body.opponent)throw Error('배틀 선정 정보를 확인하지 못했어요.');
   preparedId.current=body.battleId;preparedToken.current=body.matchToken;
   setResult(null);setOpponent(body.opponent);setSlotName('멍기록가 찾는 중…');setRandomOpponent(random);setSelected([selected[0],body.card]);
   setRevealStage(random?'nickname':'shuffle');setRevealed(false);setPhase('reveal');
   sounds.current?.play('select');
  }catch(e){setError(e.message);}
  finally{setOpponentBusy(false);}
 };
 const complete=useCallback(async()=>{
  if(finished.current||!requestId.current)return;
  finished.current=true;timers.current.forEach(clearTimeout);timers.current=[];
  setImpactBeat(0);stopBattleVibration();
  setMutating(true);sounds.current?.stop();
  try{
   const response=await fetch('/api/go/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:requestId.current,firstId:selected[0].id,secondId:selected[1].id,matchToken:preparedToken.current})});
   const body=await response.json();if(!alive.current)return;
   if(!response.ok)throw Error(body.error||'대결 결과를 저장하지 못했어요.');
   setResult(body.battle);setPhase('result');sounds.current?.play(body.battle.winner==='draw'?'draw':body.battle.winner==='first'?'victory':'defeat');timers.current.push(setTimeout(()=>sounds.current?.play('bark1'),450));
  }catch(e){
   setError(e.message);setSelected(list=>list.slice(0,1));setResult(null);
   preparedId.current=null;preparedToken.current=null;requestId.current=null;
   setPhase('opponents');
  }
  finally{setMutating(false);}
 },[selected]);
 const completeRef=useRef(complete);completeRef.current=complete;
 const start=()=>{
  if(phase!=='reveal'||mutating||!preparedId.current||!preparedToken.current||selected.length!==2||!selected.every(c=>c.battle&&c.status==='approved'))return;
  if(selected[0].ownerId!==member?.id||selected[1].ownerId===member?.id){setError('출전 카드 구성을 확인해주세요.');return;}
  finished.current=false;requestId.current=preparedId.current;setImpactBeat(0);setError('');setPhase('fight');
  sounds.current?.startMusic();sounds.current?.play('start');
  // One continuous 4.28 s animation: retreat → accelerate → impact → hit-stop → recoil.
  // Sound, flash and haptics follow the same three contact frames (21.5%, 46%, 71.3%).
  const hit=level=>{setImpactBeat(level);sounds.current?.playImpact(level);vibrateBattleHit(level);};
  timers.current=[
   setTimeout(()=>sounds.current?.play('appear'),300),
   setTimeout(()=>hit(1),920),
   setTimeout(()=>setImpactBeat(0),1110),
   setTimeout(()=>hit(2),1970),
   setTimeout(()=>setImpactBeat(0),2220),
   setTimeout(()=>hit(3),3050),
   setTimeout(()=>setImpactBeat(0),3370),
   setTimeout(()=>completeRef.current(),4280)
  ];
 };
 const startRef=useRef(null);startRef.current=start;
 const reset=()=>{stop();sounds.current?.startMusic();requestId.current=null;preparedId.current=null;preparedToken.current=null;finished.current=false;setPhase('choose');setSelected([]);setOpponent(null);setResult(null);setImpactBeat(0);setRevealed(false);setError('');setPage(0);setSearched('');setQuery('');};
 const retryOpponent=()=>{stop();preparedId.current=null;preparedToken.current=null;requestId.current=null;setSelected(list=>list.slice(0,1));setOpponent(null);setPhase('opponents');setSearched('');setQuery('');setOpponentPage(0);setError('');};
 useEffect(()=>{
  if(phase!=='reveal')return;
  let cancelled=false;const list=[];
  const after=(fn,ms)=>list.push(setTimeout(()=>{if(!cancelled)fn();},ms));
  // Reveal pacing: let players read the opponent's nickname before the card flips.
  // Existing three-hit collision timing starts only after this sequence completes.
  const NICKNAME_SPIN_MS=1150;
  const NICKNAME_HOLD_MS=500;
  const CARD_REVEAL={pick:750,flip:1220,shown:1700,fight:2550};
  let slotTimer=null;
  if(randomOpponent){
   const names=opponents.members.map(m=>m.nickname).filter(Boolean);
   let index=0;
   const advance=()=>setSlotName(names.length?names[index++%names.length]:'멍기록가 찾는 중…');
   advance();
   slotTimer=setInterval(advance,140);
   after(()=>{
    clearInterval(slotTimer);
    slotTimer=setInterval(advance,230);
   },750);
   after(()=>{
    clearInterval(slotTimer);slotTimer=null;
    setSlotName(opponent?.nickname||'멍기록가');
    setRevealStage('nickname-locked');
    sounds.current?.play('ready');
   },NICKNAME_SPIN_MS);
   after(()=>setRevealStage('shuffle'),NICKNAME_SPIN_MS+NICKNAME_HOLD_MS);
  }
  const offset=randomOpponent?NICKNAME_SPIN_MS+NICKNAME_HOLD_MS:0;
  after(()=>{setRevealStage('selected');sounds.current?.play('select');vibrateBattleHit(1);},offset+CARD_REVEAL.pick);
  after(()=>{setRevealStage('flip');sounds.current?.play('appear');},offset+CARD_REVEAL.flip);
  after(()=>{setRevealStage('shown');setRevealed(true);sounds.current?.play('ready');vibrateBattleHit(1);},offset+CARD_REVEAL.shown);
  // Hold the revealed card long enough to read its name before the existing battle.
  after(()=>startRef.current?.(),offset+CARD_REVEAL.fight);
  return()=>{cancelled=true;list.forEach(clearTimeout);if(slotTimer!==null)clearInterval(slotTimer);};
 },[phase,randomOpponent,opponent?.id]);

 const [first,second]=selected;
 const winner=result?.winner==='first'?first:result?.winner==='second'?second:null;
 const spriteMap={'깡지':'dog-kangji.png','버디':'dog-buddy.png','뽀실':'dog-pposil.png','구름':'dog-gureum.png','오레오':'dog-oreo.png'};
 const sprite=c=>spriteMap[c?.dogName]?'/figma-preview/'+spriteMap[c.dogName]:c?.imageUrl;
 const insufficient=false;
 return <div className={"meong-battle-app meong-battle-phase-"+phase}>
  
  {!ready?<p role="status">도감을 준비하고 있어요.</p>:!member?<section className="meong-battle-login"><h2>멍배틀을 시작해볼까요?</h2><p>내 멍카드를 고르고 다른 멍기록가와 배틀해보세요!</p><button onClick={openAccount}>로그인하고 시작하기</button></section>:<>
  {phase==='choose'&&<>
   <h1>멍배틀</h1><p className="meong-battle-hint">배틀에 출전할 내 멍카드를 한 장 골라주세요!</p>
   <button className="meong-battle-start-link" disabled={selected.length!==1||mutating} onClick={goOpponents}>상대 멍기록가 찾기 &gt;</button>
   <div className="meong-battle-tabs"><button className="active">내 카드</button><span>선택 {selected.length}/1</span></div>
   <form className="meong-battle-search" onSubmit={e=>{e.preventDefault();setPage(0);setSearched(query);}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="제목·강아지 이름" aria-label="내 카드 검색"/><button type="submit">검색</button></form>
   <div className="meong-battle-sort">등록 순서 | <button onClick={()=>{setPage(0);setOrder(x=>x==='newest'?'oldest':'newest');}}>{order==='newest'?'최신순':'오래된순'}⌄</button><span>전체 {data.total}장</span></div>
   <div className="meong-battle-chosen" aria-label="선택한 카드">{selected.length===0?<span className="meong-battle-chosen-placeholder">출전할 카드 한 장을 선택해주세요.</span>:<button type="button" onClick={()=>{setSelected([]);sounds.current?.play('deselect');}}>{selected[0].dogName} · {selected[0].title} ×</button>}</div>
   {error&&<p className="meong-battle-error" role="alert">{error}</p>}
   {loading?<p className="meong-battle-empty">카드를 불러오는 중이에요.</p>:data.cards.length?<div className="meong-battle-grid">{data.cards.map(c=><div className="meong-battle-entry" key={c.id}><BattleCard card={c} onSelect={()=>choose(c)} selected={selected[0]?.id===c.id}/><span>{c.nickname} 멍기록가</span><small>{c.capturedAt?new Date(c.capturedAt).toLocaleDateString('ko-KR'):''}</small></div>)}</div>:<div className="meong-battle-empty">출전 가능한 내 카드가 없어요. <Link href="/go">카드 수집하러 가기</Link></div>}
   {data.total>4&&<div className="meong-battle-pager"><button disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>‹ 이전</button><span>{page+1}</span><button disabled={!data.hasMore||loading} onClick={()=>setPage(p=>p+1)}>다음 ›</button></div>}
  </>}
  {phase==='opponents'&&<section className="meong-battle-opponents">
   <button type="button" className="meong-battle-back" onClick={()=>{setPhase('choose');setSearched('');setQuery('');setError('');}}>‹ 내 카드 선택으로</button>
   <h1>누구와 멍배틀할까요?</h1><p className="meong-battle-hint">상대 멍기록가를 선택하면 출전 카드는 랜덤으로 등장해요.</p>
   <button type="button" className="meong-battle-random" disabled={opponentBusy||loading||opponents.total===0} onClick={()=>prepare(null,true)}>↝ 랜덤 멍기록가와 배틀!</button>
   <form className="meong-battle-search" onSubmit={e=>{e.preventDefault();setOpponentPage(0);setSearched(query);}}><input aria-label="멍기록가 닉네임 검색" placeholder="멍기록가 닉네임 검색" value={query} onChange={e=>setQuery(e.target.value)}/><button type="submit">검색</button></form>
   <p className="meong-battle-opponent-count">대결 가능한 멍기록가 {opponents.total}명</p>
   {error&&<p className="meong-battle-error" role="alert">{error}</p>}
   {loading?<p className="meong-battle-empty">멍기록가를 찾는 중이에요.</p>:opponents.members.length?<div className="meong-battle-opponent-list">{opponents.members.map(m=><button type="button" key={m.id} disabled={opponentBusy} onClick={()=>prepare(m.id)}><span className="meong-battle-avatar" aria-hidden="true">{FIGMA_DOGS.includes(m.avatarDog)?<img src={figmaSprite(m.avatarDog,'front')} alt=""/>:'🐾'}</span><span className="meong-battle-opponent-info"><strong>{m.nickname} 멍기록가</strong><small>대결 가능 카드 {m.cardCount}장</small></span><span className="meong-battle-opponent-arrow">선택 ›</span></button>)}</div>:<div className="meong-battle-empty">대결 가능한 멍기록가가 없어요.</div>}
   {opponents.total>12&&<div className="meong-battle-pager"><button disabled={opponentPage===0||loading} onClick={()=>setOpponentPage(p=>p-1)}>‹ 이전</button><span>{opponentPage+1}</span><button disabled={!opponents.hasMore||loading} onClick={()=>setOpponentPage(p=>p+1)}>다음 ›</button></div>}
  </section>}
  {phase==='reveal'&&<section className="meong-battle-reveal">
   <h1>어떤 멍멍이가 등장할까요?</h1>
   <p className="meong-battle-hint">{revealStage==='nickname'?'랜덤 멍기록가를 찾는 중이에요.':revealStage==='nickname-locked'?'대결할 멍기록가가 결정됐어요!':opponent?.nickname+' 멍기록가의 출전 카드'}</p>
   <div className={'meong-battle-reveal-scene is-'+revealStage} aria-live="polite">
    {(revealStage==='nickname'||revealStage==='nickname-locked')?<div className={'meong-battle-nickname-slot'+(revealStage==='nickname-locked'?' is-locked':'')}><span>{revealStage==='nickname'?'랜덤 상대를 고르는 중…':'대결 상대 결정!'}</span><strong>{slotName}</strong></div>:<div className="meong-battle-flip-card">
     <div className="meong-battle-card-back" aria-hidden={revealed}>?</div>
     <div className="meong-battle-reveal-face" aria-hidden={!revealed}><GoCardFace card={selected[1]}/></div>
    </div>}
    {revealed&&selected[1]&&<GoElementSparkles element={elementForCard(selected[1])} variant="reveal"/>}
   </div>
   {revealed&&<p className="meong-battle-reveal-name"><strong>{selected[1]?.dogName} 등장!</strong><span>{opponent?.nickname} 멍기록가의 카드</span></p>}
   <button type="button" className="meong-battle-primary" disabled={!revealed||mutating} onClick={start}>{revealed?'바로 멍배틀 시작!':'상대 카드를 고르는 중…'}</button>
   <button type="button" className="meong-battle-secondary" onClick={retryOpponent}>다른 상대 선택</button>
  </section>}
  {phase==='fight'&&<section className="meong-battle-fight"><h1>두근두근, 멍배틀!</h1><p className="meong-battle-fight-opponent">{opponent?.nickname} 멍기록가와 대결!</p><div className={'meong-battle-versus is-battle-running'+(impactBeat?' is-impact is-impact-'+impactBeat:'')}><div className="meong-battle-fighter is-first"><div className="meong-battle-ghost ghost-long" aria-hidden="true"><GoCardFace card={first}/></div><div className="meong-battle-ghost ghost-far" aria-hidden="true"><GoCardFace card={first}/></div><div className="meong-battle-ghost ghost-near" aria-hidden="true"><GoCardFace card={first}/></div><BattleCard card={first} mini/></div><div className="meong-battle-fighter is-second"><div className="meong-battle-ghost ghost-long" aria-hidden="true"><GoCardFace card={second}/></div><div className="meong-battle-ghost ghost-far" aria-hidden="true"><GoCardFace card={second}/></div><div className="meong-battle-ghost ghost-near" aria-hidden="true"><GoCardFace card={second}/></div><BattleCard card={second} mini/></div><div className="v12-battle-impact" aria-hidden="true">{Array.from({length:12},(_,i)=><span key={i} style={{'--impact-angle':(i*30)+'deg','--impact-distance':(i%2?135:185)+'px'}}/> )}</div></div><strong>VS</strong><button className="meong-battle-primary" disabled={mutating} onClick={()=>completeRef.current()}>{mutating?'결과 기록 중…':'SKIP 후 결과보기'}</button></section>}
  {phase==='result'&&result&&<section className="meong-battle-result"><h1>이번 대결 승자는..</h1><div className="meong-battle-winner">{winner?<img src={sprite(winner)} alt={winner.dogName}/>:<><img src={sprite(first)} alt={first.dogName}/><img src={sprite(second)} alt={second.dogName}/></>}<GoElementSparkles element={elementForCard(winner||first)} secondElement={result.winner==='draw'?elementForCard(second):null} variant={result.winner==='draw'?'result':'result-loop'}/></div><h2>{winner?winner.dogName+' 카드 승리!':'막상막하!'}</h2><p>{winner?'이번 카드의 상성이 한 수 위였어요.':'두 카드의 매력을 가릴 수 없어요'}</p><div className="meong-battle-score">{first.dogName} {result.first_power+result.first_charm} + 상성 {result.first_bonus} → {result.first_score}<br/>{second.dogName} {result.second_power+result.second_charm} + 상성 {result.second_bonus} → {result.second_score}</div><p className="meong-battle-result-opponent">{opponent?.nickname} 멍기록가와의 대결</p>
    {error&&<p className="meong-battle-error" role="alert">{error}</p>}
    <button className="meong-battle-primary" onClick={()=>prepare(opponent?.id)} disabled={opponentBusy}>{opponentBusy?'상대 카드 선택 중…':'같은 멍기록가와 재대결'}</button>
    <button className="meong-battle-secondary" onClick={retryOpponent}>다른 멍기록가와 대결</button><button className="meong-battle-secondary" onClick={reset}>다른 내 카드 선택</button><Link className="meong-battle-secondary" href="/go">도감으로</Link></section>}
  </>}
 </div>;
}
export default function GoBattle(){return <GoShell active="battle" title="멍배틀" description="멍카드 두 장으로 즐기는 8비트 대결"><Game/></GoShell>;}
