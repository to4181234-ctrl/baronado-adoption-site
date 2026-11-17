'use client';

import {useCallback,useEffect,useState} from 'react';
import GoCardFace from './GoCardFace.js';
import GoCompletion from './GoCompletion.js';
import {CARD_FACE} from '../lib/goCardFace.js';

export function LockedOfficialCard({slot,hidden=false,unlockable=false}) {
  return <svg className="s2-locked-card-svg" viewBox="0 0 166 265" role="img"
    aria-label={hidden?'HIDDEN · '+(unlockable?'해금 가능':'일반 4종 수집 후 해금'):`미보유 공식 멍카드 NO.${slot}`}>
    <image href={CARD_FACE.frame} x="0" y="0" width="166" height="265"/>
    <g fontFamily="MonaS12,sans-serif">
      <text x="16" y="23" fontSize="7" fill="#181713">MEONG MEONG GO!</text>
      <rect x="16" y="28" width="134" height="132" fill="#d9d9d9"/>
      {hidden
        ? <><text x="83" y="91" textAnchor="middle" fontSize="16" fontWeight="700" fill="#777">HIDDEN</text>
           <text x="83" y="112" textAnchor="middle" fontSize="9" fill="#777">{unlockable?'눌러서 획득':'4종 모두 모으면 해금'}</text></>
        : <text x="83" y="113" textAnchor="middle" fontSize="31.5" fontWeight="700" fill="#565656">?</text>}
      <text x="16" y="181" fontSize="12.3" fontWeight="700" fill="#727272">??</text>
      <rect x="112" y="169" width="38" height="14" rx="2" fill="#ddd" stroke="#727272" strokeWidth=".6"/>
      <text x="131" y="179" textAnchor="middle" fontSize="7" fill="#777">?</text>
      {['파워','애교'].map((label,index)=><g key={label}>
        <text x="16" y={208+index*19} fontSize="10" fill="#727272">{label}</text>
        {Array.from({length:5},(_,i)=><image key={i} href={CARD_FACE.star}
          x={40+i*13.4} y={198+index*19} width="11.36" height="10.32"
          style={{filter:'grayscale(1)',opacity:.65}}/>)}
      </g>)}
      <text x="16" y="247" fontSize="7" fill="#727272">바로나도</text>
      <text x="150" y="247" textAnchor="end" fontSize="7" fill="#181713">NO.{slot}</text>
    </g>
  </svg>;
}
import {useGoSession} from './GoShell.js';

const NORMAL_COUNT=4;
const HIDDEN_SLOT=5;
const FEATURE_ENABLED=process.env.NEXT_PUBLIC_MEONGGO_STAGE2_OFFICIAL_ENABLED==='1';

export default function GoStage2OfficialCards({dogId,onCatalogLoaded}) {
  const {member,ready,openAccount}=useGoSession();
  const [dog,setDog]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [opened,setOpened]=useState(null);
  const [hiddenJustUnlocked,setHiddenJustUnlocked]=useState(false);

  const refresh=useCallback(async()=>{
    if(!FEATURE_ENABLED){setLoading(false);onCatalogLoaded?.(null);return;}
    try{
      const response=await fetch('/api/go/official',{cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'공식 멍카드 조회에 실패했어요.');
      const next=data.dogs?.find(item=>item.dogId===dogId)||null;
      setDog(next);
      onCatalogLoaded?.(next ? next.collected+Number(Boolean(next.hidden?.unlocked)):0);
      setError('');
    }catch(e){
      setError(e.message||'공식 멍카드 조회에 실패했어요.');
      onCatalogLoaded?.(null);
    }finally{setLoading(false);}
  },[dogId,onCatalogLoaded]);

  useEffect(()=>{setLoading(true);refresh();},[refresh]);

  async function request(body){
    const response=await fetch('/api/go/official',{method:'POST',
      headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok||!data.ok)throw Error(data.error||'요청을 처리하지 못했어요.');
    return data;
  }

  async function openCard(slot){
    if(!member){openAccount();return;}
    const card=dog?.slots?.find(item=>item.slot===slot);
    if(!card?.owned)return;
    setOpened({slot,card});setError('');setHiddenJustUnlocked(false);
    if(card.new){
      try{await request({action:'seen',dogId,slot});await refresh();}
      catch(e){setError(e.message);}
    }
  }

  async function openHidden(){
    if(!member){openAccount();return;}
    if(!dog)return;
    if(dog.hidden?.unlocked){
      setOpened({slot:HIDDEN_SLOT,card:dog.hidden});setError('');
      if(dog.hidden.new){
        try{await request({action:'seen',dogId,slot:HIDDEN_SLOT});await refresh();}
        catch(e){setError(e.message);}
      }
      return;
    }
    if(dog.collected!==NORMAL_COUNT||busy)return;
    setBusy(true);setError('');
    try{
      const outcome=await request({action:'unlockHidden',dogId});
      setHiddenJustUnlocked(Boolean(outcome.new));
      await refresh();
      setOpened({slot:HIDDEN_SLOT,card:null});
    }catch(e){setError(e.message||'히든 카드 해금에 실패했어요.');}
    finally{setBusy(false);}
  }

  const slots=Array.from({length:NORMAL_COUNT},(_,i)=>{
    const number=i+1;
    return dog?.slots?.find(card=>card.slot===number)||{slot:number,owned:false};
  });
  const hidden=dog?.hidden;
  const acquired=Boolean(hidden?.unlocked);
  const unlockable=Boolean(member&&dog?.collected===NORMAL_COUNT&&!acquired);
  const openedData=opened?.slot===HIDDEN_SLOT?hidden:opened?.card;
  const hiddenImage=hidden?.imageUrl;

  if(!FEATURE_ENABLED)return <p className="s2-official-empty" role="status">공식 멍카드는 전체 업데이트 이후 이용할 수 있어요.</p>;
  if(!ready||loading)return <p className="s2-official-empty" role="status">공식 멍카드를 불러오는 중…</p>;

  return <div className="s2-official">
    {error&&<p role="alert" className="v3-error">{error} <button type="button" onClick={refresh}>다시 시도</button></p>}
    {!dog&&<p className="s2-official-empty">아직 공개된 공식 멍카드가 없어요.</p>}
    <div className="s2-official-grid" aria-label="공식 멍카드 NO.1부터 NO.4 및 히든">
      {slots.map(card=><div key={card.slot} className="s2-official-slot">
        {card.owned&&card.imageUrl?
          <button className="s2-official-card" type="button" onClick={()=>openCard(card.slot)} aria-label={`공식 멍카드 NO.${card.slot} 보기`}>
            <GoCardFace card={{dogName:dog?.name||'멍멍이',nickname:'바로나도',
              imageUrl:card.imageUrl,title:card.title,
              capturedAt:null,battle:{power:card.power,charm:card.charm}}}/>
            <span className="s2-official-number">NO.{card.slot}</span>
            {card.new&&<span className="s2-official-new">NEW</span>}
          </button>:
          <div className="s2-official-locked"><LockedOfficialCard slot={card.slot}/></div>}
      </div>)}
      <div className="s2-official-slot">
        <button type="button" className={'s2-official-hidden '+(unlockable?'is-unlockable':'')}
          aria-label={acquired?'HIDDEN 카드 보기':unlockable?'HIDDEN 카드 해금':'미해금 HIDDEN 카드'}
          disabled={!acquired&&!unlockable||busy||!dog}
          onClick={openHidden}>
          {acquired&&hiddenImage?<img src={hiddenImage} alt={dog?.name+' HIDDEN 일러스트'}/>:
            <LockedOfficialCard slot={HIDDEN_SLOT} hidden unlockable={unlockable}/>}
          {acquired&&<span className="s2-official-number">NO.{HIDDEN_SLOT}</span>}
          {hidden?.new||unlockable?<b className="s2-official-new">NEW</b>:null}
        </button>
      </div>
    </div>
    <p className="s2-official-help">{!dog?'':acquired?'히든 카드 해금 완료':unlockable?'일반 멍카드 4종을 모았어요. HIDDEN 카드를 눌러 해금하세요.':'일반 멍카드 4종을 모으면 HIDDEN 카드를 열 수 있어요.'}</p>
    {hiddenJustUnlocked&&hiddenImage&&<GoCompletion viewOnly
      card={{dogName:dog?.name||'멍멍이',nickname:'바로나도',imageUrl:hiddenImage,
        title:'HIDDEN',status:'approved',battle:{power:0,charm:0}}}
      viewerActions={<button type="button" className="go-primary go-complete-continue" onClick={()=>{setOpened(null);setHiddenJustUnlocked(false);}}>내 도감에서 보기</button>}
      onDone={()=>{setOpened(null);setHiddenJustUnlocked(false);}}/>}
    {opened&&openedData?.imageUrl&&!hiddenJustUnlocked&&
      <div className="v5-modal-backdrop" role="presentation" onClick={()=>{setOpened(null);setHiddenJustUnlocked(false);}}>
        <section className="s2-official-viewer" role="dialog" aria-modal="true" aria-label="공식 멍카드 보기" onClick={e=>e.stopPropagation()}>
          <button type="button" className="s2-official-close" aria-label="닫기" onClick={()=>{setOpened(null);setHiddenJustUnlocked(false);}}>×</button>
          <h2>{opened.slot===HIDDEN_SLOT?'HIDDEN · '+dog.name:openedData.title||'공식 멍카드'}</h2>
          {opened.slot===HIDDEN_SLOT?<img src={openedData.imageUrl} alt={dog.name+' 특별 일러스트'}/>:
            <GoCardFace card={{dogName:dog.name,nickname:'바로나도',imageUrl:openedData.imageUrl,
              capturedAt:openedData.acquiredAt,battle:{power:openedData.power,charm:openedData.charm}}}/>}
          {hiddenJustUnlocked&&<p>특별 일러스트를 획득했어요!</p>}
          <button type="button" onClick={()=>{setOpened(null);setHiddenJustUnlocked(false);}}>내 도감에서 보기</button>
        </section>
      </div>}
  </div>;
}
