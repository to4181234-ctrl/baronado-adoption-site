'use client';
import {useState} from 'react';
import GoCardFace from './GoCardFace.js';
import GoSoundToggle from './GoSoundToggle.js';
import {LockedOfficialCard} from './GoStage2OfficialCards.js';

/** Approved Figma 558:606067 comparison → 558:606964 confirmation. */
export default function GoDuplicateCompare({dog,duplicate,busy,error,onResolve,onClose}){
 const [choice,setChoice]=useState(null);
 const [confirm,setConfirm]=useState(false);
 const owned=dog?.slots?.find(card=>card.slot===duplicate.slot);
 const baseline={dogName:dog?.name||'강아지',nickname:'바로나도',title:owned?.title||'공식 멍카드',
  imageUrl:owned?.imageUrl||'',battle:{power:owned?.power??1,charm:owned?.charm??1},status:'approved',capturedAt:owned?.acquiredAt||null,officialSlot:duplicate.slot};
 const proposed={...baseline,battle:{power:duplicate.proposedPower,charm:duplicate.proposedCharm}};
 return <div className="go-duplicate-overlay" role="presentation">
  <section className={'go-duplicate-screen'+(confirm?' is-confirm':'')} role="dialog" aria-modal="true" aria-label="중복 멍카드 비교">
   <button className="go-duplicate-close" type="button" onClick={onClose} disabled={busy} aria-label="중복 카드 창 닫기">×</button>
   {confirm?<>
    <h2>정말 이 카드로 선택하시겠어요?</h2>
    <div className="go-duplicate-confirm-card">{(choice?proposed:baseline).imageUrl?<GoCardFace card={choice?proposed:baseline}/>:<LockedOfficialCard slot={duplicate.slot}/>}</div>
    <div className="go-duplicate-confirm-buttons">
     <button type="button" disabled={busy} onClick={()=>onResolve(choice)}>네</button>
     <button type="button" disabled={busy} onClick={()=>setConfirm(false)}>아니오</button>
    </div>
   </>:<>
    <h2>이미 가지고 있는 멍카드예요!</h2>
    <div className="go-duplicate-cards">
     {[{card:baseline,label:'기존 카드',replace:false},{card:proposed,label:'새 카드',replace:true}].map(entry=><div key={entry.label}>
       <div className="go-duplicate-card-frame">{entry.card.imageUrl?<GoCardFace card={entry.card}/>:<LockedOfficialCard slot={duplicate.slot}/>}</div>
       <strong>{entry.label}</strong>
     </div>)}
    </div>
    <div className="go-duplicate-buttons">
     <button type="button" disabled={busy} onClick={()=>{setChoice(false);setConfirm(true);}}>기존 카드 유지하기</button>
     <button type="button" disabled={busy} onClick={()=>{setChoice(true);setConfirm(true);}}>새 카드로 교체하기</button>
    </div>
   </>}
   {error&&<p role="alert" className="go-duplicate-error">{error}</p>}
   <GoSoundToggle className="go-duplicate-sound"/>
  </section>
 </div>;
}
