'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useGoSession } from './GoShell.js';
import { useGoCoins } from './GoCoins.js';
import { GO_STAGE2_UI_ENABLED } from './GoOfficialAlbum.js';
import { GO_STAGE3_UI_ENABLED } from './GoFriendBattle.js';

export default function GoQuests({ compact = false }) {
  const { member, ready, openAccount } = useGoSession();
  const coins = useGoCoins();
  const [notice, setNotice] = useState('');
  if (!coins?.enabled) return null;

  const tasks = [
    {
      id: 'care', title: '오늘 첫 돌보기', coins: 10,
      caption: '강아지와 처음 교감하면 10C를 받아요.',
      completed: Boolean(coins.daily?.careQuestDone),
      href: '/go'
    },
    {
      id: 'visit', title: '음료 구매 방문 인증', coins: 30,
      caption: '방문 후 직원에게 음료 구매를 인증해 주세요.',
      completed: Boolean(coins.daily?.visitQuestDone),
      href: '/go/visit'
    }
  ];
  if(GO_STAGE2_UI_ENABLED)tasks.push({
    id:'draw',title:'오늘의 무료 공식 멍카드 뽑기',coins:10,
    caption:'오늘의 첫 공식 멍카드 뽑기로 10C를 받아요.',
    completed:Boolean(coins.daily?.drawQuestDone),href:'/go'
  });
  if(GO_STAGE3_UI_ENABLED)tasks.push({
    id:'battle',title:'오늘의 첫 친구 멍배틀',coins:10,
    caption:'친구와 1:1 대결을 정상 완료하면 승·무·패 관계없이 10C!',
    completed:Boolean(coins.daily?.battleQuestDone),href:'/go/battle'
  });
  tasks.sort((a,b)=>Number(a.completed)-Number(b.completed));

  const done = tasks.filter(item => item.completed).length;
  return <section className={'go-quest-section' + (compact ? ' go-quest-compact' : '')}
    aria-label="오늘의 퀘스트">
    <header className="go-quest-heading">
      <div>
        <h2>오늘의 퀘스트</h2>
        <p>매일 자정에 새로운 퀘스트를 시작해요.</p>
      </div>
      <b>{member ? done : 0} / {tasks.length}</b>
    </header>
    <div className="go-quest-progress" aria-label={'완료한 퀘스트 ' + done + '/' + tasks.length}>
      <span style={{ width: (member ? done / tasks.length * 100 : 0) + '%' }} />
    </div>
    {member ? <>
      {coins.error && <p className="go-coin-error" role="alert">{coins.error}
        <button type="button" onClick={coins.refresh}>새로고침</button></p>}
      {coins.loading && <p className="go-quest-loading" role="status">진행 상황 확인 중…</p>}
      <div className="go-quest-items">
        {tasks.map(task => <article className="go-quest-item" key={task.id}>
          <div>
            <strong>{task.title}</strong>
            <small>{task.caption}</small>
          </div>
          <div className="go-quest-item-action">
            <b>+{task.coins}C</b>
            {task.completed ?
              <button type="button" onClick={() => setNotice('오늘 이미 완료한 퀘스트예요.')}>완료</button> :
              <Link href={task.href}>{task.id === 'visit' ? '인증하기' : task.id==='draw'?'뽑으러가기':task.id==='battle'?'배틀하러가기':'돌보러가기'} ›</Link>}
          </div>
        </article>)}
      </div>
      {notice && <p className="go-quest-note" role="status">{notice}</p>}
    </> : <div className="go-quest-login">
      <p>{ready ? '로그인하면 퀘스트를 시작할 수 있어요.' : '로그인 정보를 확인하고 있어요.'}</p>
      {ready && <button type="button" onClick={openAccount}>로그인하고 시작하기</button>}
    </div>}
    {compact && <Link className="go-quest-all-link" href="/go/quests">퀘스트 자세히 보기 ›</Link>}
    <p className="go-quest-caption">{GO_STAGE3_UI_ENABLED?'3차 출시 퀘스트 4종 · 최대 퀘스트 보상 60C':GO_STAGE2_UI_ENABLED?'2차 출시 퀘스트 3종 · 최대 퀘스트 보상 50C':'1차 출시 퀘스트 2종 · 최대 퀘스트 보상 40C'}</p>
  </section>;
}
