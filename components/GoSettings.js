'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {fetchDogs} from '../lib/dogs.js';
import GoShell,{useGoSession} from './GoShell.js';
import {figmaSprite,FIGMA_DOGS} from '../lib/goV3Game.js';
import {GAME_SOUND_KEY} from '../lib/goV3Audio.js';

// The avatar and text are one unsaved profile edit. Never PATCH the profile in the avatar picker.
const AVATAR_DRAFT_KEY='meonggo-avatar-pending';
const PROFILE_DRAFT_KEY='meonggo-profile-edit-draft';
const safeRead=(key)=>{try{return sessionStorage.getItem(key)}catch{return null}};
const safeRemove=(key)=>{try{sessionStorage.removeItem(key)}catch{}};
const saveTextDraft=(memberId,nickname,bio)=>{try{sessionStorage.setItem(PROFILE_DRAFT_KEY,JSON.stringify({memberId,nickname,bio}))}catch{}};
const clearDraft=()=>{safeRemove(AVATAR_DRAFT_KEY);safeRemove(PROFILE_DRAFT_KEY)};
const portraitOf=name=>name==='구름'?'/figma-v3/gureum-side.png':figmaSprite(name,'front');

function SettingsContent(){
 const router=useRouter();
 const pathname=usePathname()||'/go/settings';
 const tab=pathname.endsWith('/profile')?'profile':pathname.endsWith('/avatar')?'avatar':'settings';
 const {member,ready,openAccount}=useGoSession();
 const [sound,setSound]=useState(true),[popup,setPopup]=useState(true);
 const [bio,setBio]=useState(''),[nickname,setNickname]=useState(''),[avatar,setAvatar]=useState(null);
 const [owned,setOwned]=useState([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const [initializedMember,setInitializedMember]=useState(null);

 useEffect(()=>{try{setSound(localStorage.getItem(GAME_SOUND_KEY)!=='off')}catch{}},[]);
 useEffect(()=>{
  if(!ready||!member)return;
  let alive=true;
  fetch('/api/go/settings',{cache:'no-store'})
   .then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'팝업 설정을 불러오지 못했어요.');return d})
   .then(d=>{if(alive)setPopup(Boolean(d.popupEnabled))})
   .catch(e=>{if(alive)setMsg(e.message)});
  return()=>{alive=false};
 },[ready,member?.id]);
 useEffect(()=>{
  if(!member){setOwned([]);return;}
  let draft=null;
  try{const stored=safeRead(PROFILE_DRAFT_KEY);const parsed=stored?JSON.parse(stored):null;if(parsed?.memberId===member.id)draft=parsed;else if(parsed)safeRemove(PROFILE_DRAFT_KEY)}catch{safeRemove(PROFILE_DRAFT_KEY)}
  setBio(draft?.bio??member.profileBio??'');
  setNickname(draft?.nickname??member.nickname??'');
  const pending=safeRead(AVATAR_DRAFT_KEY);
  setAvatar(pending&&FIGMA_DOGS.includes(pending)?pending:member.avatarDog||null);
  setInitializedMember(member.id);
  let alive=true;
  Promise.all([
   fetch('/api/go/collection',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('도감 현황을 불러오지 못했어요.');return r.json()}),
   fetchDogs('adoption')
  ]).then(([data,dogs])=>{if(alive)setOwned(dogs.filter(d=>(data.counts?.[d.id]||0)>0).map(d=>d.name))}).catch(()=>{});
  return()=>{alive=false};
 },[member?.id]);

 const editNickname=value=>{setNickname(value);if(member)saveTextDraft(member.id,value,bio)};
 const editBio=value=>{setBio(value);if(member)saveTextDraft(member.id,nickname,value)};
 async function saveProfile(){
  if(!member){openAccount();return}
  if(!nickname.trim()||busy)return;
  setBusy(true);setMsg('');
  try{
   const body={bio:bio.trim(),nickname:nickname.trim()};
   // Preserve the existing avatar when its collection data is still loading.
   if(avatar!==member.avatarDog){
    if(!owned.includes(avatar))throw Error('수집한 멍멍이 중에서 대표 캐릭터를 선택해주세요.');
    body.avatarDog=avatar;
   }
   const r=await fetch('/api/go/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const d=await r.json();if(!r.ok)throw Error(d.error||'저장에 실패했어요.');
   clearDraft();setMsg('프로필 변경사항을 저장했어요.');router.push('/go');router.refresh();
  }catch(e){setMsg(e.message)}finally{setBusy(false)}
 }
 async function saveSettings(){
  if(busy)return;setBusy(true);setMsg('');
  try{
   // Sound is a browser preference. Account popup is a separate, server-side preference.
   if(member){const r=await fetch('/api/go/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',popupEnabled:popup})});const d=await r.json();if(!r.ok)throw Error(d.error||'팝업 설정을 저장하지 못했어요.')}
   localStorage.setItem(GAME_SOUND_KEY,sound?'on':'off');
   window.dispatchEvent(new Event('go-v3-settings-changed'));
   setMsg(member?'설정을 저장했어요.':'이 브라우저의 소리 설정을 저장했어요.');
  }catch(e){setMsg(e.message||'설정을 저장하지 못했어요.')}finally{setBusy(false)}
 }
 async function resetPopupHide(){
  if(!member){openAccount();return}
  if(busy)return;setBusy(true);setMsg('');
  try{
   const r=await fetch('/api/go/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resetHide'})});
   const d=await r.json();if(!r.ok)throw Error(d.error||'7일 숨김을 해제하지 못했어요.');
   setMsg('7일 숨김을 해제했어요. 오늘 이미 본 팝업은 다시 자동으로 뜨지 않아요.');
  }catch(e){setMsg(e.message||'숨김을 해제하지 못했어요.')}finally{setBusy(false)}
 }
 const settings=tab==='settings',profile=tab==='profile',avatarPicker=tab==='avatar';
 const back=settings?'/go':avatarPicker?'/go/profile':'/go';
 const doBack=()=>{if(profile)clearDraft();if(avatarPicker)safeRemove(AVATAR_DRAFT_KEY)};
 return <div className={'v3-settings v3-account-figma v3-account-'+tab}>
  <Link href={back} onClick={doBack} className="v3-back">‹ 뒤로</Link>
  {!ready||member&&initializedMember!==member.id?<p className="v3-status">설정을 불러오고 있어요.</p>:!member&&!settings?<div className="v3-account-login-required"><h1>{profile?'프로필 수정':'나를 표현할 멍멍이'}</h1><p>로그인 후 나만의 프로필을 수정할 수 있어요.</p><button type="button" className="v3-account-save" onClick={openAccount}>로그인하고 시작하기</button></div>:
  settings?<>
   <h1>시스템 설정</h1>
   <div className="v3-account-setting-row v3-account-setting-sound">
    <strong>소리</strong><button type="button" aria-pressed={sound} onClick={()=>setSound(x=>!x)}>{sound?'켜짐':'꺼짐'}</button>
    <small>첫 터치 후 발견·카드 완성·배틀 효과음 재생</small>
   </div>
   <div className="v3-account-setting-row v3-account-setting-popup">
    <strong>첫 방문 팝업</strong><button type="button" aria-pressed={popup} disabled={!member||busy} onClick={()=>setPopup(x=>!x)}>{popup?'켜짐':'꺼짐'}</button>
    <button className="v3-account-reset" type="button" disabled={!member||busy} onClick={resetPopupHide}>7일 숨김 해제</button>
   </div>
   <p className="v3-settings-note">소리 설정은 이 브라우저에 저장돼요.<br/>팝업 노출과 7일 숨김은 계정 기준으로 적용돼요.</p>
   <button type="button" className="v3-account-save" disabled={busy} onClick={saveSettings}>{busy?'저장 중…':'저장'}</button>
   <Link href={member?'/go/withdraw':'/go/settings'} onClick={member?undefined:(e)=>{e.preventDefault();openAccount()}} className="v3-account-withdraw">회원 탈퇴</Link>
  </>:profile?<>
   <h1>프로필 수정</h1>
   <div className="v3-profile-edit-portrait"><img src={avatar&&owned.includes(avatar)?portraitOf(avatar):'/figma-v3/album-shadow-gureum.svg'} alt={avatar&&owned.includes(avatar)?avatar:'기본 실루엣'}/></div>
   <Link className="v3-outline-btn" href="/go/avatar">대표 캐릭터 바꾸기</Link>
   <label className="v3-input-label v3-account-nickname">닉네임<input value={nickname} maxLength={8} onChange={e=>editNickname(e.target.value)} autoComplete="nickname"/><small>2~8자 · 중복 불가</small></label>
   <label className="v3-input-label v3-account-bio">한 줄 소개<textarea maxLength={50} rows={3} value={bio} onChange={e=>editBio(e.target.value)} placeholder="나만의 이야기를 적어주세요."/><small>최대 50자</small></label>
   <button className="v3-account-save" disabled={busy||Array.from(nickname.trim()).length<2||Array.from(nickname.trim()).length>8} onClick={saveProfile}>{busy?'저장 중…':'변경사항 저장'}</button>
  </>:<>
   <h1>나를 표현할 멍멍이</h1><p className="v3-settings-note">수집한 강아지 중에서 선택할 수 있어요.</p>
   <div className="v3-avatar-grid">{FIGMA_DOGS.map(name=>{
    const unlocked=owned.includes(name),key=({깡지:'kangji',버디:'buddy',뽀실:'pposil',구름:'gureum',오레오:'oreo'})[name];
    const selected=unlocked&&avatar===name;
    return <button key={name} type="button" disabled={!unlocked} aria-pressed={selected} className={selected?'chosen':''} onClick={()=>setAvatar(name)}>
     <img src={unlocked?portraitOf(name):'/figma-v3/album-shadow-'+key+'.svg'} alt=""/>
     <span>{name}{unlocked?'':' · 미획득'}</span>
    </button>
   })}</div>
   <button className="v3-account-save" disabled={busy||!owned.includes(avatar)} onClick={()=>{try{sessionStorage.setItem(AVATAR_DRAFT_KEY,avatar)}catch{}router.push('/go/profile')}}>{owned.includes(avatar)?avatar+'으로 임시 선택':'멍멍이 선택'}</button>
  </>}
  {msg&&<p className="v3-message" role="status">{msg}</p>}
 </div>
}
export default function GoSettings(){return <GoShell active="settings"><SettingsContent/></GoShell>}
