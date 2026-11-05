'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import GoShell,{useGoSession} from './GoShell.js';
import GoCard from './GoCard.js';
import GoReveal from './GoReveal.js';
import {postSparkleSrc} from './GoElementSparkles.js';
import GoCardExport from './GoCardExport.js';
import GoPostEditor from './GoPostEditor.js';
import GoReport from './GoReport.js';
import {audioEnabled,GAME_SOUND_KEY,notifyAudioSettingChanged} from '../lib/goV3Audio.js';
function Post({id}){
 const {member,ready,openAccount}=useGoSession();
 const [card,setCard]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[exporting,setExporting]=useState(false),[liking,setLiking]=useState(false),[reportOpen,setReportOpen]=useState(false),[editing,setEditing]=useState(false),[notice,setNotice]=useState('');
 const pending=useRef(false);
 const [sound,setSound]=useState(true);
 useEffect(()=>{const sync=()=>setSound(audioEnabled());sync();window.addEventListener('go-v3-settings-changed',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('go-v3-settings-changed',sync);window.removeEventListener('storage',sync);};},[]);
 function toggleSound(){try{localStorage.setItem(GAME_SOUND_KEY,sound?'off':'on');notifyAudioSettingChanged();}catch{setNotice('소리 설정을 저장할 수 없어요. 브라우저 저장 권한을 확인해주세요.');}}
 useEffect(()=>{if(!ready)return;const controller=new AbortController();setLoading(true);setError('');setCard(null);
 fetch('/api/go/cards/'+id,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'카드를 찾지 못했어요.');if(!controller.signal.aborted)setCard(d.card);}).catch(e=>{if(!controller.signal.aborted)setError(e.message||'카드를 찾지 못했어요.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[id,ready,member?.id]);
 function needsLogin(){if(member)return false;openAccount();return true;}
 async function toggleLike(){if(needsLogin()||liking||pending.current)return;pending.current=true;setLiking(true);setNotice('');try{const r=await fetch('/api/go/cards/'+id+'/like',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({liked:!card.liked})});const d=await r.json();if(!r.ok)throw Error(d.error||'좋아요를 저장하지 못했어요.');setCard(p=>({...p,...d}));}catch(e){setNotice(e.message);}finally{pending.current=false;setLiking(false);}}

 const date=card?.createdAt||card?.capturedAt;
 return <article className="v6-public-post">
  {error&&<p className="v6-status" role="alert">{error}</p>}
  {loading&&<p role="status">카드를 불러오는 중이에요.</p>}
  {!loading&&card&&<>
   <img className="v10-post-sparkle v10-post-sparkle-top" src={postSparkleSrc("top",card)} alt="" aria-hidden="true"/>
   <img className="v10-post-sparkle v10-post-sparkle-bottom" src={postSparkleSrc("bottom",card)} alt="" aria-hidden="true"/>
   <button className="v10-post-sound" type="button" onClick={toggleSound} aria-label={sound?'소리 끄기':'소리 켜기'} aria-pressed={sound}><img src={sound?'/figma-post/sound-on.svg':'/figma-v3/sound-off.png'} alt=""/></button>
   <h1>{card.title||card.dogName+'의 기록'}</h1>
   <div className="v6-post-card"><GoReveal key={card.id} card={card}><GoCard card={card} member={member} compact/></GoReveal></div>
   {card.ownerId?<Link className="v6-post-author" href={'/go/recorders/'+card.ownerId}>{card.nickname} 멍기록가</Link>:<span className="v6-post-author">{card.nickname} 멍기록가</span>}
   {date&&<time className="v6-post-date" dateTime={date}>{new Date(date).toLocaleDateString('ko-KR').replace(/\s/g,'').replace(/\.$/,'')}</time>}
   <div className="v6-post-actions"><button type="button" onClick={toggleLike} disabled={liking} aria-pressed={Boolean(card.liked)}>{card.liked&&<span className="go-like-burst" aria-hidden="true">♥</span>}♡ 좋아요 {card.likeCount||0}</button><button type="button" className="v6-save" onClick={()=>needsLogin()||setExporting(true)}>이미지 저장·공유</button><Link className="v6-dog-link" href={'/dogs/'+card.dogId}>{card.dogName} 소개 보기 ↗</Link></div>
   {card.ownerId!==member?.id&&<button type="button" className="v6-report" onClick={()=>needsLogin()||setReportOpen(s=>!s)}>신고하기</button>}
   {card.ownerId===member?.id&&<button type="button" className="v6-report" onClick={()=>setEditing(true)}>제목 수정</button>}
   {reportOpen&&<GoReport cardId={card.id} onClose={()=>setReportOpen(false)} onSubmitted={()=>{setReportOpen(false);setNotice('신고가 접수됐어요.');}}/>}
   {editing&&<GoPostEditor card={card} onClose={()=>setEditing(false)} onSaved={updated=>{setCard(updated);setEditing(false);setNotice('제목을 수정했어요.');}}/>}
   {notice&&<p className="v6-status" role="status">{notice}</p>}
   {exporting&&<GoCardExport card={card} onClose={()=>setExporting(false)} onRecorded={count=>setCard(p=>({...p,shareCount:Math.max(p.shareCount||0,count)}))}/>}
  </>}
 </article>;
}
export default function GoPost({id}){return <GoShell active="post"><Post id={id}/></GoShell>;}
