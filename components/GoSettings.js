'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {fetchDogs} from '../lib/dogs.js';
import GoShell,{useGoSession} from './GoShell.js';
import {figmaSprite,FIGMA_DOGS} from '../lib/goV3Game.js';
import {GAME_SOUND_KEY} from '../lib/goV3Audio.js';
const HIDE_KEY='baronado-go-intro-hide-until';
function SettingsContent(){
 const router=useRouter();
 const pendingKey='meonggo-avatar-pending';
 const pathname=usePathname()||'/go/settings',tab=pathname.endsWith('/profile')?'profile':pathname.endsWith('/avatar')?'avatar':'settings';
 const {member,ready,openAccount,openWithdraw}=useGoSession();
 const [sound,setSound]=useState(true),[popup,setPopup]=useState(true),[bio,setBio]=useState(''),[nickname,setNickname]=useState(''),[avatar,setAvatar]=useState(null),[owned,setOwned]=useState([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 useEffect(()=>{try{setSound(localStorage.getItem(GAME_SOUND_KEY)!=='off');}catch{}},[]);
 useEffect(()=>{
  if(!ready||!member)return;
  let alive=true;
  fetch('/api/go/settings',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'팝업 설정을 불러오지 못했어요.');return d;})
   .then(d=>{if(alive)setPopup(d.popupEnabled);})
   .catch(e=>{if(alive)setMsg(e.message);});
  return()=>{alive=false;};
 },[ready,member?.id]);
 useEffect(()=>{if(!member)return;setBio(member.profileBio||'');setNickname(member.nickname||'');let pending=null;try{pending=sessionStorage.getItem(pendingKey)}catch{}setAvatar(pending||member.avatarDog||null);
 Promise.all([fetch('/api/go/collection',{cache:'no-store'}).then(r=>r.json()),fetchDogs('adoption')]).then(([data,dogs])=>{setOwned(dogs.filter(d=>(data.counts?.[d.id]||0)>0).map(d=>d.name))}).catch(()=>{});
 },[member?.id]);
 async function saveProfile(){if(!member){openAccount();return;}setBusy(true);setMsg('');try{
 const body={bio:bio.trim(),nickname:nickname.trim(),avatarDog:avatar};
 const r=await fetch('/api/go/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();
 if(!r.ok)throw Error(d.error||'저장에 실패했어요.');try{sessionStorage.removeItem(pendingKey)}catch{}setMsg('프로필 변경사항을 저장했어요.');router.push('/go');router.refresh();}
 catch(e){setMsg(e.message);}finally{setBusy(false);}}
 async function saveSettings(){
  if(!member){openAccount();return;}
  setBusy(true);setMsg('');
  try{
   const r=await fetch('/api/go/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',popupEnabled:popup})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'팝업 설정을 저장하지 못했어요.');
   localStorage.setItem(GAME_SOUND_KEY,sound?'on':'off');
   window.dispatchEvent(new Event('go-v3-settings-changed'));
   setMsg('설정을 저장했어요.');
  }catch(e){setMsg(e.message||'설정을 저장하지 못했어요.');}
  finally{setBusy(false);}
 }
 async function resetPopupHide(){
  if(!member){openAccount();return;}
  setBusy(true);setMsg('');
  try{
   const r=await fetch('/api/go/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resetHide'})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'7일 숨김을 해제하지 못했어요.');
   setMsg('7일 숨김을 해제했어요. 오늘 이미 본 팝업은 다시 자동으로 뜨지 않아요.');
  }catch(e){setMsg(e.message||'숨김을 해제하지 못했어요.');}
  finally{setBusy(false);}
 }
 return <div className="v3-settings">
  <Link href={tab==='settings'?'/go':tab==='avatar'?'/go/profile':'/go'} onClick={()=>{if(tab==='profile')try{sessionStorage.removeItem(pendingKey)}catch{}}} className="v3-back">‹ 뒤로</Link>
  {!ready?<p className="v3-status">설정을 불러오고 있어요.</p>:tab==='settings'?<><h1>시스템 설정</h1>
   <div className="v3-setting-item"><div><strong>소리</strong><small>첫 터치 후 발견·카드 완성·배틀 효과음 재생</small></div><button type="button" aria-pressed={sound} onClick={()=>setSound(x=>!x)}>{sound?'켜짐':'꺼짐'}</button></div>
   <div className="v3-setting-item"><div><strong>첫 방문 팝업</strong><button className="v3-setting-reset" type="button" disabled={busy||!member} onClick={resetPopupHide}>7일 숨김 해제</button></div><button type="button" aria-pressed={popup} disabled={busy||!member} onClick={()=>setPopup(x=>!x)}>{popup?'켜짐':'꺼짐'}</button></div>
   <p className="v3-settings-note">소리 설정은 이 브라우저에 저장돼요.<br/>팝업 노출과 7일 숨김은 계정 기준으로 적용돼요.</p>
   <button className="v3-yellow-btn" disabled={busy} onClick={saveSettings}>{busy?'저장 중…':'저장'}</button>
   <Link className="v3-settings-text-link" href="/go/profile">프로필 수정 ›</Link>
   <button className="v3-yellow-btn v3-withdraw" onClick={()=>member?openWithdraw():openAccount()}>회원 탈퇴</button>
   </>:tab==='profile'?<><h1>프로필 수정</h1><div className="v3-profile-edit-portrait"><img src={figmaSprite(avatar||"구름",avatar?"front":"shadow")} alt={avatar||"미획득 실루엣"}/></div><Link className="v3-outline-btn" href="/go/avatar">대표 캐릭터 바꾸기</Link>
    <label className="v3-input-label">닉네임<input value={nickname} maxLength={8} onChange={e=>setNickname(e.target.value)} autoComplete="nickname"/><small>2~8자 · 중복 불가</small></label>
    <label className="v3-input-label">한 줄 소개<textarea maxLength={50} rows={3} value={bio} onChange={e=>setBio(e.target.value)} placeholder="나만의 이야기를 적어주세요."/><small>최대 50자</small></label>
    <button className="v3-yellow-btn" disabled={busy||nickname.trim().length<2} onClick={saveProfile}>변경사항 저장</button></>:<><h1>나를 표현할 멍멍이</h1><p className="v3-settings-note">수집한 강아지 중에서 선택할 수 있어요.</p><div className="v3-avatar-grid">{FIGMA_DOGS.map(name=>{const unlocked=owned.includes(name);return <button key={name} type="button" disabled={!unlocked} aria-pressed={avatar===name} className={avatar===name?'chosen':''} onClick={()=>setAvatar(name)}><img src={figmaSprite(name,unlocked?'front':'shadow')} alt={name}/><span>{name}{unlocked?'':' · 미획득'}</span></button>})}</div><button className="v3-yellow-btn" disabled={busy||!owned.includes(avatar)} onClick={()=>{try{sessionStorage.setItem(pendingKey,avatar)}catch{}router.push('/go/profile')}}>{avatar}으로 인사 선택</button></>}
  {msg&&<p className="v3-message" role="status">{msg}</p>}
 </div>;
}
export default function GoSettings(){return <GoShell active="settings"><SettingsContent/></GoShell>;}
