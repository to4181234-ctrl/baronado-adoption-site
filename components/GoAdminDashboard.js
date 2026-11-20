'use client';
import {useEffect,useMemo,useState} from 'react';
import GoAdminStats from './GoAdminStats.js';

const TABS=[
 {key:'overview',name:'전체 현황'},
 {key:'cards',name:'멍카드·뽑기'},
 {key:'coins',name:'멍코인·퀘스트'},
 {key:'battle',name:'배틀·돌보기'},
 {key:'community',name:'커뮤니티'}
];
const PERIODS=[
 {key:'today',name:'오늘'},
 {key:'7d',name:'최근 7일'},
 {key:'30d',name:'최근 30일'},
 {key:'all',name:'전체 기간'}
];
const comma=n=>Number(n||0).toLocaleString('ko-KR');

/** New statistics dashboard: independent, read-only queries against existing data.
 * Legacy monthly post statistics remain available under the Community tab.
 */
export default function GoAdminDashboard(){
 const [tab,setTab]=useState('overview'),[period,setPeriod]=useState('7d');
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  setLoading(true);setData(null);setError('');
  const query=new URLSearchParams({tab,period});
  fetch('/api/admin/go/dashboard?'+query,{cache:'no-store',signal:controller.signal})
   .then(async response=>{
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(payload.error||'통계를 불러오지 못했어요.');
    return payload;
   })
   .then(payload=>{if(!controller.signal.aborted)setData(payload);})
   .catch(e=>{if(!controller.signal.aborted)setError(e.message);})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[tab,period]);
 const current=TABS.find(item=>item.key===tab);
 const peak=useMemo(()=>Math.max(1,...(data?.chart?.rows||[]).map(row=>Number(row.count)||0)),[data]);
 return <div className="go-dashboard">
  <div className="go-dashboard-top">
   <nav role="tablist" aria-label="멍멍GO 통계 구분" className="go-dashboard-tabs">
    {TABS.map(item=><button type="button" key={item.key} role="tab"
      aria-selected={tab===item.key} aria-controls="go-dashboard-panel"
      className={tab===item.key?'active':''} onClick={()=>setTab(item.key)}>{item.name}</button>)}
   </nav>
   <div role="group" aria-label="통계 집계 기간" className="go-dashboard-periods">
    {PERIODS.map(item=><button type="button" key={item.key} aria-pressed={period===item.key}
      className={period===item.key?'active':''} onClick={()=>setPeriod(item.key)}>{item.name}</button>)}
   </div>
  </div>
  <section id="go-dashboard-panel" role="tabpanel" className="go-dashboard-content" aria-label={current?.name}>
   <div className="go-dashboard-section-head"><h2>{current?.name}</h2><span>한국 시간 기준 · {PERIODS.find(x=>x.key===period)?.name}</span></div>
   {loading&&<p role="status" className="go-dashboard-state">통계를 집계하고 있어요…</p>}
   {error&&<p role="alert" className="go-dashboard-state is-error">{error}</p>}
   {!loading&&data&&<>
    <div className="go-dashboard-metrics">
     {data.cards?.map(item=><article className="go-dashboard-metric" key={item.label}>
      <h3>{item.label}</h3><p><strong>{comma(item.value)}</strong><span>{item.unit}</span></p>
      {item.detail&&<small>{item.detail}</small>}
     </article>)}
    </div>
    <div className="go-dashboard-chart">
     <h3>{data.chart?.title}</h3>
     {data.chart?.rows?.length?<div className="go-dashboard-bars" role="img"
       aria-label={data.chart.title+' · '+data.chart.rows.map(r=>r.day+': '+r.count).join(', ')}>
      {data.chart.rows.map((r,i)=><div className="go-dashboard-bar-item" key={r.day}>
       <strong>{comma(r.count)}</strong>
       <div className="go-dashboard-bar-track"><span style={{height:(Math.max(0,Number(r.count))/peak*100)+'%'}}/></div>
       <small>{period==='all'?r.day:r.day.slice(5).replace('-','.')}</small>
      </div>)}
     </div>:<p className="go-dashboard-empty">선택한 기간에 기록된 활동이 없어요.</p>}
     <p className="go-dashboard-note">그래프는 기록이 있는 날짜만 표시합니다. 전체 기간은 최근 최대 12개월을 표시합니다.</p>
    </div>
    <div className="go-dashboard-breakdown">
     <h3>{tab==='battle'?'강아지별 돌보기 현황':tab==='community'?'강아지별 게시물':'세부 현황'}</h3>
     {data.rows?.length?<div className="go-dashboard-breakdown-list">
      {data.rows.map((r,i)=><div key={r.label+i} className="go-dashboard-breakdown-row">
       <span>{r.label}</span><strong>{comma(r.count)}</strong>
      </div>)}
     </div>:<p className="go-dashboard-empty">집계할 기록이 없어요.</p>}
    </div>
    {data.note&&<p className="go-dashboard-help">{data.note}</p>}
   </>}
   {tab==='community'&&<details className="go-dashboard-legacy">
    <summary>기존 게시물·좋아요 통계 상세 보기</summary>
    <GoAdminStats/>
   </details>}
  </section>
 </div>;
}
