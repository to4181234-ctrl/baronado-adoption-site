'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {useRouter} from 'next/navigation';
import GoVisitPanel from './GoVisitPanel.js';
import GoFreeDraw from './GoFreeDraw.js';
import { useGoSession } from './GoShell.js';
import { useGoCoins } from './GoCoins.js';
import {isQuestAvailable,visibleQuestRewards} from '../lib/goStage3Quests.js';
const DRAW_AVAILABLE=process.env.NEXT_PUBLIC_MEONGGO_STAGE4_STORE_ENABLED==='1';
const BATTLE_AVAILABLE=process.env.NEXT_PUBLIC_MEONGGO_STAGE5_PVP_ENABLED==='1';

export default function GoQuests({ compact = false }) {
  const { member, ready, openAccount } = useGoSession();
  const coins = useGoCoins();
  const router = useRouter();
  const [careBusy,setCareBusy]=useState(false);
  const [careError,setCareError]=useState('');
  async function goToCare(){
    if(careBusy||coins.loading||coins.daily?.careQuestDone)return;
    setCareBusy(true);setCareError('');
    try {
      const res=await fetch('/api/go/quests/care-target',{cache:'no-store'});
      const data=await res.json();
      if(!res.ok||!data.dogId)throw Error(data.error||'방문할 수 있는 멍멍이가 없어요.');
      router.push('/go/interact/'+encodeURIComponent(data.dogId));
    }catch(e){setCareError(e.message||'멍멍이를 찾지 못했어요.');}
    finally{setCareBusy(false);}
  }
  const [visitOpen,setVisitOpen]=useState(false);
  const [drawOpen,setDrawOpen]=useState(false);
  useEffect(()=>{if(!visitOpen)return;const onKey=e=>{if(e.key==='Escape')setVisitOpen(false)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[visitOpen]);
  if (!coins?.enabled) return null;

  const tasks = [
    {
      id: 'visit', title: '바로나도에 놀러왔개', coins: 30,
      caption: '바로나도 방문 후 직원에게 인증해주세요',
      completed: Boolean(coins.daily?.visitQuestDone),
      href: '/go/visit'
    },
    {
      id: 'care', title: '멍멍이 만나러가기', coins: 10,
      caption: '친밀도가 아직 최대가 아닌 멍멍이를 만나러 가요',
      completed: Boolean(coins.daily?.careQuestDone),
      href: '/go/quests'
    }
  ];
  if(isQuestAvailable('draw',{draw:DRAW_AVAILABLE,battle:BATTLE_AVAILABLE}))tasks.push({
    id:'draw',title:'랜덤 멍카드 뽑기',coins:10,
    caption:'아직 만나지 못한 멍카드를 뽑을지도?',
    completed:Boolean(coins.daily?.drawQuestDone),href:'/go/quests'
  });
  if(isQuestAvailable('battle',{draw:DRAW_AVAILABLE,battle:BATTLE_AVAILABLE}))tasks.push({
    id:'battle',title:'멍배틀 하기',coins:10,
    caption:'친구와 1:1 멍배틀을 하면 승패 상관없이 멍코인!',
    completed:Boolean(coins.daily?.battleQuestDone),href:'/go/battle'
  });
  // Figma 558:466129 keeps the visible order: visit, care, random draw, battle.

  const done = tasks.filter(item => item.completed).length;
  return <section className={'go-quest-section' + (compact ? ' go-quest-compact' : '')}
    aria-label="오늘의 퀘스트">
    <header className="go-quest-heading">
      <div>
        <h2>오늘의 퀘스트</h2>
        <p>매일 자정에 새로 시작되는 퀘스트를 완료하고 멍코인을 모아보세요!<br/>멍코인으로 아직 만나지 못한 최애 멍카드를 수집해보세요.</p>
      </div>
      <b>완료 퀘스트 {member ? done : 0} / {tasks.length}</b>
    </header>
    <div className="go-quest-progress" aria-label={'완료한 퀘스트 ' + done + '/' + tasks.length}>
      <span style={{ width: (member ? done / tasks.length * 100 : 0) + '%' }} />
    </div>
    {member ? <>
      {careError&&<p className="go-coin-error" role="alert">{careError}</p>}
      {coins.error && <p className="go-coin-error" role="alert">{coins.error}
        <button type="button" onClick={coins.refresh}>새로고침</button></p>}
      {coins.loading && <p className="go-quest-loading" role="status">진행 상황 확인 중…</p>}
      <div className="go-quest-items">
        {tasks.map(task => <article className={'go-quest-item' + (task.completed ? ' is-complete' : '')} key={task.id}>
          <div>
            {task.completed
              ? <span className="go-quest-title is-complete" aria-disabled="true">{task.title}</span>
              : coins.loading
                ? <span className="go-quest-title" aria-disabled="true">{task.title} &gt;</span>
                : task.id==='care'
                  ? <button className="go-quest-title" type="button" onClick={goToCare} disabled={careBusy}>{careBusy?'멍멍이 찾는 중…':task.title+' >'}</button>
                : task.id==='draw' && !compact
                  ? <button className="go-quest-title" type="button" onClick={()=>setDrawOpen(true)}>{task.title} &gt;</button>
                  : task.id==='visit' && !compact
                    ? <button className="go-quest-title" type="button" onClick={()=>setVisitOpen(true)}>{task.title} &gt;</button>
                    : <Link className="go-quest-title" href={task.href} aria-label={task.id==='battle'?'랜덤 또는 친구 1:1 멍배틀, 오늘 첫 완료 시 10 멍코인':undefined}>{task.title} &gt;</Link>}
            <small>{task.caption}</small>
          </div>
          <div className="go-quest-item-action">
            <b>{task.completed?'완료':`+${task.coins} 멍코인`}</b>
          </div>
        </article>)}
      </div>
    </> : <div className="go-quest-login">
      <p>{ready ? '로그인하면 퀘스트를 시작할 수 있어요.' : '로그인 정보를 확인하고 있어요.'}</p>
      {ready && <button type="button" onClick={openAccount}>로그인하고 시작하기</button>}
    </div>}
    {drawOpen&&!compact&&<GoFreeDraw onClose={()=>setDrawOpen(false)}/>}
    {visitOpen&&!compact&&<div className="go-visit-modal-backdrop" onClick={()=>setVisitOpen(false)}>
      <section className="go-visit-modal" role="dialog" aria-modal="true" aria-label="바로나도에 놀러왔개" onClick={e=>e.stopPropagation()}>
        <button className="go-visit-modal-close" type="button" aria-label="닫기" onClick={()=>setVisitOpen(false)}>×</button>
        <GoVisitPanel embedded/>
      </section>
    </div>}
    {compact && <Link className="go-quest-all-link" href="/go/quests">퀘스트 자세히 보기 ›</Link>}
    {compact && <p className="go-quest-caption">오늘 이용 가능한 퀘스트 {tasks.length}종 · 퀘스트 완료 보상 최대 {visibleQuestRewards({draw:DRAW_AVAILABLE,battle:BATTLE_AVAILABLE})}C</p>}
  </section>;
}
