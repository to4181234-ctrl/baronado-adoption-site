'use client';

import {useCallback,useEffect,useState} from 'react';
import GoCardFace from './GoCardFace.js';
import GoAlbumCardDetail from './GoAlbumCardDetail.js';
import {CARD_FACE} from '../lib/goCardFace.js';

export function LockedOfficialCard({slot,hidden=false,unlockable=false,storePreview=false}) {
  return <svg className="s2-locked-card-svg" viewBox="0 0 166 265" role="img"
    aria-label={hidden?'HIDDEN · '+(unlockable?'해금 가능':'일반 4종 수집 후 해금'):`미보유 공식 멍카드 NO.${slot}`}>
    {hidden&&<image href="/figma-official/hidden-pixel-bg.png" x="0" y="0" width="166" height="265" style={{imageRendering:'pixelated'}}/>}
    <image href={CARD_FACE.frame} x="0" y="0" width="166" height="265"/>
    <g fontFamily="MonaS12,sans-serif">
      <text x="16" y="23" fontSize="7" fill="#181713">MEONG MEONG GO!</text>
      {!hidden&&<rect x="16" y="28" width="134" height="132" fill="#d9d9d9"/>}
      {hidden
        ? <><text x="83" y="92" textAnchor="middle" fontSize="16" fontWeight="700" fill="#777">HIDDEN</text>
           <text x="83" y="111" textAnchor="middle" fontSize="9" fill="#777">4종 모두 모으면 해금</text></>
        : <text x="83" y="113" textAnchor="middle" fontSize="31.5" fontWeight="700" fill="#565656">?</text>}
      <text x="16" y="181" fontSize="12.3" fontWeight="700" fill="#727272">??</text>
      <rect x="112" y="169" width="38" height="14" rx="2" fill="#ddd" stroke="#727272" strokeWidth=".6"/>
      <text x="131" y="179" textAnchor="middle" fontSize="7" fill="#777">?</text>
      {['파워','애교'].map((label,index)=><g key={label}>
        <text x="16" y={208+index*19} fontSize="10" fill="#727272">{label}</text>
        {Array.from({length:5},(_,i)=><image key={i} href={CARD_FACE.star}
          x={40+i*13.4} y={198+index*19} width="11.36" height="10.32"
          style={storePreview?{filter:'grayscale(1)'}:{filter:'grayscale(1)',opacity:.65}}/>)}
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
  const [selectionMode,setSelectionMode]=useState(false);
  const [selectedSlots,setSelectedSlots]=useState([]);
  const [sortOrder,setSortOrder]=useState('newest');
  const [confirmDelete,setConfirmDelete]=useState(false);

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

  async function deleteOfficial(){
    if(busy||!selectedSlots.length)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/go/official',{method:'DELETE',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({dogId,slots:selectedSlots})});
      const result=await response.json();
      if(!response.ok||!result.ok||result.deletedSlots?.length!==selectedSlots.length)
        throw Error(result.error||'선택한 공식 카드를 삭제하지 못했어요.');
      setSelectionMode(false);setSelectedSlots([]);setConfirmDelete(false);
      await refresh();
    }catch(e){setError(e.message||'카드 삭제에 실패했어요.');}
    finally{setBusy(false);}
  }
  function toggleSlot(slot){setSelectedSlots(prev=>prev.includes(slot)?prev.filter(v=>v!==slot):[...prev,slot]);}
  const slots=Array.from({length:NORMAL_COUNT},(_,i)=>{
    const number=i+1;
    return dog?.slots?.find(card=>card.slot===number)||{slot:number,owned:false};
  });
  const hidden=dog?.hidden;
  const acquired=Boolean(hidden?.unlocked);
  const unlockable=Boolean(member&&dog?.collected===NORMAL_COUNT&&!acquired);
  const openedData=opened?.slot===HIDDEN_SLOT?hidden:opened?.card;
  const hiddenImage=hidden?.imageUrl;
  const sortedSlots=slots.slice().sort((a,b)=>{
    if(a.owned!==b.owned)return Number(b.owned)-Number(a.owned);
    const ta=Date.parse(a.acquiredAt||'')||0,tb=Date.parse(b.acquiredAt||'')||0;
    return a.owned?(sortOrder==='newest'?tb-ta:ta-tb)||a.slot-b.slot:a.slot-b.slot;
  });
  const officialFace=(slot,card)=>({
    dogName:dog?.name||'멍멍이',nickname:'바로나도',title:card?.title||'',
    imageUrl:card?.imageUrl||'',officialSlot:slot,
    capturedAt:card?.acquiredAt||card?.unlockedAt||null,
    unknownScores:slot===HIDDEN_SLOT&&(card?.power==null||card?.charm==null),
    battle:{power:card?.power??null,charm:card?.charm??null}
  });

  if(!FEATURE_ENABLED)return <p className="s2-official-empty" role="status">공식 멍카드는 전체 업데이트 이후 이용할 수 있어요.</p>;
  if(!ready||loading)return <p className="s2-official-empty" role="status">공식 멍카드를 불러오는 중…</p>;

  return <div className="s2-official">
    {member&&dog&&<div className="s2-official-manage">
      <div className="v5-manage-actions">
        <button type="button" disabled={busy} onClick={()=>{setSelectionMode(v=>!v);setSelectedSlots([]);}}>
          {selectionMode?'선택 취소':'선택 삭제'}</button>
        {selectionMode&&<button type="button" disabled={!selectedSlots.length||busy} className="v5-manage-delete" onClick={()=>setConfirmDelete(true)}>{selectedSlots.length}장 삭제</button>}
      </div>
      <label className="v5-sort-control">등록 순서ㅣ
        <select aria-label="공식 멍카드 등록 순서" value={sortOrder} onChange={e=>setSortOrder(e.target.value)}>
          <option value="newest">최신순</option><option value="oldest">오래된순</option>
        </select>
      </label>
    </div>}

    {error&&<p role="alert" className="v3-error">{error} <button type="button" onClick={refresh}>다시 시도</button></p>}
    {!dog&&<p className="s2-official-empty">아직 공개된 공식 멍카드가 없어요.</p>}
    <div className="s2-official-grid" aria-label="공식 멍카드 NO.1부터 NO.4 및 히든">
      {sortedSlots.map(card=><div key={card.slot} className="s2-official-slot">
        {card.owned?(card.imageUrl?<>
          <button className="s2-official-card" type="button" onClick={()=>selectionMode?toggleSlot(card.slot):openCard(card.slot)}
            aria-pressed={selectionMode?selectedSlots.includes(card.slot):undefined}
            aria-label={`공식 멍카드 NO.${card.slot} ${card.title||''} ${selectionMode?'삭제 선택':'보기'}`}> 
            <GoCardFace card={officialFace(card.slot,card)}/>
            {!selectionMode&&card.new&&<span className="s2-official-new">NEW</span>}
          </button>
          {card.title&&<small className="s2-official-card-caption">{card.title}</small>}
        </>:<div className="s2-official-unavailable" role="status">NO.{card.slot} 카드 이미지를 불러오지 못했어요.</div>):<div className="s2-official-locked"><LockedOfficialCard slot={card.slot}/></div>}
      </div>)}
      <div className="s2-official-slot">
        <button type="button" className={'s2-official-hidden '+(unlockable?'is-unlockable':'')}
          aria-pressed={selectionMode&&acquired?selectedSlots.includes(HIDDEN_SLOT):undefined}
          aria-label={acquired?'HIDDEN 카드 보기':unlockable?'HIDDEN 카드 해금':'미해금 HIDDEN 카드'}
          disabled={(!acquired&&!unlockable)||busy||!dog||(acquired&&!hiddenImage)||selectionMode&&!acquired} onClick={()=>selectionMode?toggleSlot(HIDDEN_SLOT):openHidden()}>
          {acquired?(hiddenImage?<GoCardFace card={officialFace(HIDDEN_SLOT,hidden)}/>:<span className="s2-official-unavailable" role="status">HIDDEN 이미지를 불러오지 못했어요.</span>):
            <LockedOfficialCard slot={HIDDEN_SLOT} hidden unlockable={unlockable}/>}
          {!selectionMode&&acquired&&hidden?.new&&<span className="s2-official-new">NEW</span>}
        </button>
        {acquired&&hidden?.title&&<small className="s2-official-card-caption">{hidden.title}</small>}
      </div>
    </div>
    {confirmDelete&&<div className="v5-modal-backdrop" role="presentation" onClick={()=>!busy&&setConfirmDelete(false)}>
      <section role="dialog" aria-modal="true" className="v5-delete-dialog s2-delete-dialog" aria-label="선택한 공식 멍카드 삭제 확인" onClick={e=>e.stopPropagation()}>
        <button type="button" className="s2-delete-close" disabled={busy} aria-label="닫기" onClick={()=>setConfirmDelete(false)}>×</button>
        <h2>선택한 공식 멍카드 {selectedSlots.length}장을<br/>삭제할까요?</h2>
        <p>획득 기록과 능력치는 삭제되며 복구할 수 없어요.<br/>다른 사람의 카드는 유지돼요.</p>
        <div className="s2-delete-actions"><button type="button" disabled={busy} onClick={()=>setConfirmDelete(false)}>취소</button><button type="button" disabled={busy} onClick={deleteOfficial}>{busy?'삭제 중…':'삭제'}</button></div>
      </section>
    </div>}
    <p className="s2-official-help">{!dog?'':acquired?'히든 카드 해금 완료':unlockable?'일반 멍카드 4종을 모았어요. HIDDEN 카드를 눌러 해금하세요.':'일반 멍카드 4종을 모으면 HIDDEN 카드를 열 수 있어요.'}</p>
    {hiddenJustUnlocked&&hiddenImage&&<GoAlbumCardDetail official
      card={{...officialFace(HIDDEN_SLOT,hidden),status:'approved'}}
      onClose={()=>{setOpened(null);setHiddenJustUnlocked(false);}}/>}
    {opened&&openedData?.imageUrl&&!hiddenJustUnlocked&&<GoAlbumCardDetail official
      card={{...officialFace(opened.slot,openedData),status:'approved'}}
      onClose={()=>{setOpened(null);setHiddenJustUnlocked(false);}}/>}
  </div>;
}
