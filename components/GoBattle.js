'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import GoShell,{useGoSession} from './GoShell.js';
import {createBattleSound,BATTLE_SOUND_KEY} from '../lib/goBattleSound.js';
import './GoBattle.css';

const initial={cards:[],hasMore:false,total:0};
function BattleCard({card,selected,onSelect,disabled=false,mini=false}){
 const stats=card.battle;
 return <button type="button" className={'meong-battle-card'+(selected?' is-picked':'')+(mini?' is-mini':'')} onClick={onSelect} disabled={disabled||!onSelect} aria-pressed={Boolean(selected)}>
  <img className="meong-battle-frame" src="/figma-preview/card-frame.svg" alt=""/>
  <span className="meong-card-content">
   <span className="meong-card-brand">MEONG MEONG GO!</span>
   <img className="meong-card-photo" src={card.imageUrl} alt={card.dogName+' 카드 사진'}/>
   <span className="meong-card-element">{stats?.element||'속성 확인'}</span>
   <strong>{card.dogName}</strong>
   <span className="meong-card-rating">파워 <em>{stats?.power?'★'.repeat(stats.power):'-'}</em></span>
   <span className="meong-card-rating">애교 <em>{stats?.charm?'★'.repeat(stats.charm):'-'}</em></span>
   <span className="meong-card-author">BY. {card.nickname}<small>{card.capturedAt?new Date(card.capturedAt).toLocaleDateString('ko-KR') : ''}</small></span>
  </span>{selected&&<span className="meong-card-selected">✓</span>}
 </button>;
}
function Game(){
 const {member,ready,openAccount}=useGoSession();
 const [tab,setTab]=useState('all'),[query,setQuery]=useState(''),[searched,setSearched]=useState('');
 const [order,setOrder]=useState('newest'),[page,setPage]=useState(0);
 const [data,setData]=useState(initial),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [selected,setSelected]=useState([]),[phase,setPhase]=useState('choose');
 const [colliding,setColliding]=useState(false),[result,setResult]=useState(null),[mutating,setMutating]=useState(false);
 const [soundEnabled,setSoundEnabled]=useState(false),[soundReady,setSoundReady]=useState(false);
 const sounds=useRef(null),timers=useRef([]),requestId=useRef(null),finished=useRef(false);
 const stop=useCallback(()=>{timers.current.forEach(clearTimeout);timers.current=[];sounds.current?.stop();},[]);
 useEffect(()=>{sounds.current=createBattleSound();setSoundEnabled(localStorage.getItem(BATTLE_SOUND_KEY)!=='off');setSoundReady(true);const hidden=()=>{if(document.hidden)sounds.current?.stop();};document.addEventListener('visibilitychange',hidden);return()=>{stop();sounds.current?.dispose();document.removeEventListener('visibilitychange',hidden);};},[stop]);
 useEffect(()=>{if(soundReady)sounds.current?.setMuted(!soundEnabled);},[soundEnabled,soundReady]);
 useEffect(()=>{if(!ready||!member){setData(initial);return;}const ctl=new AbortController();setLoading(true);setError('');const qs=new URLSearchParams({mine:tab==='mine'?'1':'0',q:searched,order,page:String(page)});
 fetch('/api/go/battle?'+qs,{cache:'no-store',signal:ctl.signal}).then(r=>r.json().then(j=>{if(!r.ok)throw Error(j.error||'카드를 불러오지 못했어요.');return j;})).then(j=>setData(j)).catch(e=>{if(!ctl.signal.aborted)setError(e.message);}).finally(()=>{if(!ctl.signal.aborted)setLoading(false);});
 return()=>ctl.abort();},[ready,member?.id,tab,searched,order,page]);
 const choose=(card)=>{
  if(phase!=='choose'||!card.battle)return;
  const old=selected.some(c=>c.id===card.id);
  if(old){setSelected(list=>list.filter(c=>c.id!==card.id));sounds.current?.play('deselect');return;}
  if(selected.length===2)return;
  if(selected.some(c=>c.dogId===card.dogId)){setError('서로 다른 강아지 카드를 골라주세요.');return;}
  setError('');setSelected(list=>[...list,card]);
  sounds.current?.play(selected.length===1?'ready':'select');
 };
 const complete=useCallback(async()=>{
  if(finished.current||!requestId.current)return;
  finished.current=true;timers.current.forEach(clearTimeout);timers.current=[];
  setMutating(true);sounds.current?.stop();
  try{
   const response=await fetch('/api/go/battle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:requestId.current,firstId:selected[0].id,secondId:selected[1].id})});
   const body=await response.json();
   if(!response.ok)throw Error(body.error||'대결 결과를 저장하지 못했어요.');
   setResult(body.battle);setPhase('result');sounds.current?.play(body.battle.winner==='draw'?'draw':body.battle.winner==='first'?'victory':'defeat');
  }catch(e){setError(e.message);setPhase('choose');}
  finally{setMutating(false);}
 },[selected]);
 const completeRef=useRef(complete);completeRef.current=complete;
 const start=()=>{
  if(phase!=='choose'||mutating||selected.length!==2||!selected.every(c=>c.battle))return;
  finished.current=false;requestId.current=crypto.randomUUID();setColliding(false);setError('');setPhase('fight');
  sounds.current?.play('start');sounds.current?.startMusic();
  timers.current=[setTimeout(()=>sounds.current?.play('appear'),500),setTimeout(()=>{setColliding(true);sounds.current?.duckMusic();sounds.current?.play('impact');},1400),setTimeout(()=>completeRef.current(),3000)];
 };
 const reset=()=>{stop();requestId.current=null;finished.current=false;setPhase('choose');setSelected([]);setResult(null);setColliding(false);setError('');setPage(0);};
 const changeTab=(name)=>{setTab(name);setPage(0);setError('');};
 const [first,second]=selected;
 const winner=result?.winner==='first'?first:result?.winner==='second'?second:null;
 const spriteMap={'깡지':'dog-kangji.png','버디':'dog-buddy.png','뽀실':'dog-pposil.png','구름':'dog-gureum.png','오레오':'dog-oreo.png'};
 const sprite=c=>spriteMap[c?.dogName]?'/figma-preview/'+spriteMap[c.dogName]:c?.imageUrl;
 return <div className="meong-battle-app">
  <div className="meong-battle-toolbar"><span>멍배틀</span><button type="button" aria-label={soundEnabled?'소리 끄기':'소리 켜기'} onClick={()=>{const on=!soundEnabled;setSoundEnabled(on);localStorage.setItem(BATTLE_SOUND_KEY,on?'on':'off');}}>{soundEnabled?'🔊 소리 켜짐':'🔇 소리 꺼짐'}</button></div>
  {!ready?<p role="status">도감을 준비하고 있어요.</p>:!member?<section className="meong-battle-login"><h2>멍배틀을 시작해볼까요?</h2><p>서로 다른 멍카드 2장을 모아 대결하고 나만의 전적을 쌓아보세요!</p><button onClick={openAccount}>로그인하고 시작하기</button></section>:<>
  {phase==='choose'&&<>
   <h1>멍배틀</h1><p className="meong-battle-hint">서로 다른 강아지 카드 2장을 골라주세요</p>
   <button className="meong-battle-start-link" disabled={selected.length!==2} onClick={start}>선택한 2장으로 멍배틀하기 &gt;</button>
   <div className="meong-battle-tabs"><button className={tab==='mine'?'active':''} onClick={()=>changeTab('mine')}>내 카드</button><button className={tab==='all'?'active':''} onClick={()=>changeTab('all')}>모두의 카드</button><span>선택 {selected.length}/2</span></div>
   <form className="meong-battle-search" onSubmit={e=>{e.preventDefault();setPage(0);setSearched(query);}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="제목·작성자·강아지 이름"/><button type="submit">검색</button></form>
   <div className="meong-battle-sort">등록 순서 | <button onClick={()=>{setPage(0);setOrder(x=>x==='newest'?'oldest':'newest');}}>{order==='newest'?'최신순':'오래된순'}⌄</button><span>전체 {data.total}장</span></div>
   <div className="meong-battle-chosen">{selected.length===0&&<span className="meong-battle-chosen-placeholder">고른 카드 2장을 이곳에서 확인할 수 있어요.</span>}{selected.map(c=><button key={c.id} onClick={()=>choose(c)}>{c.dogName} · {c.title} ×</button>)}</div>
   {error&&<p className="meong-battle-error" role="alert">{error}</p>}
   {loading?<p className="meong-battle-empty">카드를 불러오는 중이에요.</p>:data.cards.length?<div className="meong-battle-grid">{data.cards.map(c=><div className="meong-battle-entry" key={c.id}><BattleCard card={c} onSelect={()=>choose(c)} selected={selected.some(v=>v.id===c.id)}/><span>{c.nickname} 멍기록가</span><small>{c.capturedAt?new Date(c.capturedAt).toLocaleDateString('ko-KR'):''}</small></div>)}</div>:<div className="meong-battle-empty">표시할 카드가 없어요. {tab==='mine'?'카드를 수집하러 가볼까요?':''}</div>}
   <div className="meong-battle-pager"><button disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>‹ 이전</button><span>{page+1}</span><button disabled={!data.hasMore||loading} onClick={()=>setPage(p=>p+1)}>다음 ›</button></div>
  </>}
  {phase==='fight'&&<section className="meong-battle-fight"><h1>두근두근, 멍배틀!</h1><div className={'meong-battle-versus'+(colliding?' is-colliding':'')}><BattleCard card={first} mini/><BattleCard card={second} mini/></div><strong>VS</strong><button className="meong-battle-primary" disabled={mutating} onClick={()=>completeRef.current()}>{mutating?'결과 기록 중…':'SKIP 후 결과보기'}</button></section>}
  {phase==='result'&&result&&<section className="meong-battle-result"><h1>이번 대결 승자는..</h1><div className="meong-battle-winner">{winner?<img src={sprite(winner)} alt={winner.dogName}/>:<><img src={sprite(first)} alt={first.dogName}/><img src={sprite(second)} alt={second.dogName}/></>}</div><h2>{winner?winner.dogName+' 카드 승리!':'막상막하!'}</h2><p>{winner?'이번 카드의 상성이 한 수 위였어요.':'두 카드의 매력을 가릴 수 없어요'}</p><div className="meong-battle-score">{first.dogName} {result.first_power+result.first_charm} + 상성 {result.first_bonus} → {result.first_score}<br/>{second.dogName} {result.second_power+result.second_charm} + 상성 {result.second_bonus} → {result.second_score}</div><button className="meong-battle-primary" onClick={reset}>다른 카드로 대결</button><Link className="meong-battle-secondary" href="/go">도감으로</Link></section>}
  </>}
 </div>;
}
export default function GoBattle(){return <GoShell active="battle" title="멍배틀" description="멍카드 두 장으로 즐기는 8비트 대결"><Game/></GoShell>;}
