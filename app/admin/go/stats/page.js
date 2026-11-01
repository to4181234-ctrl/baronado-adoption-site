'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import AdminGuard from '../../../../components/AdminGuard.js';
import SiteHeader from '../../../../components/SiteHeader.js';
function CardStatistics(){
 const [range,setRange]=useState('30'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[dog,setDog]=useState('all'),[applied,setApplied]=useState({range:'30',start:'',end:'',dog:'all'}),[dogPage,setDogPage]=useState(0),[postPage,setPostPage]=useState(0);
 const [result,setResult]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const params=useMemo(()=>{const p=new URLSearchParams({range:applied.range,dog:applied.dog,dogPage:String(dogPage),postPage:String(postPage)});if(applied.range==='custom'){p.set('start',applied.start);p.set('end',applied.end)}return p},[applied,dogPage,postPage]);
 const load=useCallback(async()=>{if(applied.range==='custom'&&(!applied.start||!applied.end)){setResult(null);setLoading(false);return;}setLoading(true);setError('');try{const r=await fetch('/api/admin/go/stats-v2?'+params,{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error(data.error||'통계를 불러오지 못했어요.');setResult(data)}catch(e){setError(e.message)}finally{setLoading(false)}},[params,applied]);
 useEffect(()=>{load()},[load]);
 const download=()=>{const p=new URLSearchParams(params);p.delete('dogPage');p.delete('postPage');p.set('download','1');window.location.href='/api/admin/go/stats-v2?'+p};
 const max=Math.max(1,...(result?.chart||[]).map(row=>row.total));
 return <main className="site-shell v3-site v3-admin-stats-site"><SiteHeader/><section className="v3-admin-stats"><Link className="v3-back" href="/admin/go">‹ 관리 메뉴</Link><h1>카드 통계</h1><p className="v3-admin-stats-subtitle">기간과 강아지를 고르면 해당 현황만 보여요.</p>
  <div className="v3-admin-stats-range"><button aria-pressed={range==='7'} onClick={()=>{setRange('7');setDogPage(0);setPostPage(0)}}>최근 7일</button><button aria-pressed={range==='30'} onClick={()=>{setRange('30');setDogPage(0);setPostPage(0)}}>최근 30일</button><button aria-pressed={range==='month'} onClick={()=>setRange('month')}>이번 달</button><button aria-pressed={range==='all'} onClick={()=>setRange('all')}>전체 기간</button></div>
  <div className="v3-admin-stats-custom"><span>기간 직접 선택</span><input type="date" aria-label="시작일" value={start} onChange={e=>{setStart(e.target.value);setRange('custom')}}/><input type="date" aria-label="종료일" value={end} onChange={e=>{setEnd(e.target.value);setRange('custom')}}/></div>
  <label className="v3-admin-stats-dog">강아지 <select value={dog} onChange={e=>setDog(e.target.value)}><option value="all">전체</option>{(result?.dogs||[]).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><button className="v3-admin-stats-apply" onClick={()=>{setDogPage(0);setPostPage(0);setApplied({range,start,end,dog})}}>이 조건으로 보기</button>
  {error&&<p role="alert" className="v3-error">{error}</p>}{loading?<p>불러오는 중…</p>:!result?<p>조회 기간을 선택해 주세요.</p>:<>
   <p className="v3-admin-stats-period">기간: {result.period.first} ~ {result.period.last} (한국 시간 기준)</p>
   <div className="v3-admin-stats-totals">{[['total','전체 카드'],['published','공개 카드'],['likes','좋아요'],['shares','저장·공유']].map(([key,label])=><div key={key}><span>{label}</span><strong>{result.totals[key]}</strong></div>)}</div>
   <h2>카드 등록 추이</h2>{result.chart.length?<div className="v3-admin-stats-chart">{result.chart.map(d=><div key={d.date} className="v3-admin-stats-bar"><span>{d.date}</span><i style={{width:`${100*d.total/max}%`}}/><b>{d.total}</b></div>)}</div>:<p>집계할 게시물이 없어요.</p>}
   <h2>강아지별 현황</h2>{result.dogRanking.items.map(row=><div className="v3-admin-stats-row" key={row.id}><b>{row.name}</b><span>{row.total}개 · 공개 {row.published} · 좋아요 {row.likes}</span></div>)}<div className="v3-admin-pages"><button disabled={dogPage===0} onClick={()=>setDogPage(i=>i-1)}>이전</button><span>{dogPage+1} / {Math.max(1,Math.ceil(result.dogRanking.total/10))}</span><button disabled={(dogPage+1)*10>=result.dogRanking.total} onClick={()=>setDogPage(i=>i+1)}>다음</button></div>
   <h2>게시물별 반응</h2>{result.postRanking.items.map(row=><Link href={'/admin/go/card/'+row.id} className="v3-admin-stats-row" key={row.id}><b>{row.title||'제목 없음'}</b><span>{row.dog_name} · 좋아요 {row.like_count||0}</span></Link>)}<div className="v3-admin-pages"><button disabled={postPage===0} onClick={()=>setPostPage(i=>i-1)}>이전</button><span>{postPage+1} / {Math.max(1,Math.ceil(result.postRanking.total/5))}</span><button disabled={(postPage+1)*5>=result.postRanking.total} onClick={()=>setPostPage(i=>i+1)}>다음</button></div>
   {result.truncated&&<p className="v3-error">조회 결과가 10,000건을 초과해 일부 결과가 생략됐어요.</p>}<button className="v3-admin-stats-download" onClick={download}>통계 내려받기</button>
  </>}
 </section></main>
}
export default function GoStatsAdminPage(){return <AdminGuard><CardStatistics/></AdminGuard>}
