'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard.js';
import SiteHeader from '../../../components/SiteHeader.js';
import {supabase} from '../../../lib/supabaseClient.js';
import {bannerHref} from '../../../lib/bannerRules.js';
const targets={none:'연결 없음',adoption:'가족을 찾아요',resident:'상주견 소개',go:'멍멍GO!',external:'외부 링크'};
const fresh=()=>({title:'',image_url:'',image_alt:'',target_type:'none',target_url:'',enabled:true});
function Artwork({banner,className=''}){
 return <div className={'v10-banner-art '+className+(banner.image_url==='/figma-v3/hero-logo.svg'?' is-logo':'')}>
  {banner.image_url?<img src={banner.image_url} alt={banner.image_alt||banner.title||'배너 미리보기'}/>:<span>배너 이미지를 등록해주세요.</span>}
 </div>;
}
function BannerEditor(){
 const [banners,setBanners]=useState([]),[editing,setEditing]=useState(null),[draft,setDraft]=useState(fresh()),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[dirty,setDirty]=useState(false),[preview,setPreview]=useState(null);
 const uploadInput=useRef(null),previewClose=useRef(null),previewTrigger=useRef(null),mutating=useRef(false);
 const reload=useCallback(async()=>{const r=await fetch('/api/admin/banners',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'배너 목록을 불러오지 못했어요.');setBanners(d.banners);setDirty(false);},[]);
 useEffect(()=>{reload().catch(e=>setError(e.message));},[reload]);
 useEffect(()=>{if(!preview)return;previewTrigger.current=document.activeElement;previewClose.current?.focus();const escape=e=>{if(e.key==='Escape')setPreview(null);if(e.key==='Tab'){e.preventDefault();previewClose.current?.focus();}};document.addEventListener('keydown',escape);const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',escape);document.body.style.overflow=before;previewTrigger.current?.focus();};},[preview]);
 const edit=b=>{if(dirty&&!window.confirm('저장하지 않은 순서·노출 변경을 취소하고 편집할까요?'))return;reload().catch(e=>setError(e.message));setEditing(b?.id||'new');setDraft(b?{...fresh(),...b}:fresh());setError('');setNotice('');};
 async function upload(file){
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024||file.size===0){setError('JPG/PNG/WebP 파일만 최대 3MB까지 가능해요.');return;}
  setUploading(true);setError('');
  try{const r=await fetch('/api/admin/uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,type:file.type,size:file.size})});const d=await r.json();if(!r.ok)throw Error(d.error||'업로드 준비 실패');if(!supabase)throw Error('이미지 업로드 설정을 확인해주세요.');const {error:err}=await supabase.storage.from('dog-images').uploadToSignedUrl(d.data.path,d.data.token,file,{contentType:file.type});if(err)throw err;setDraft(v=>({...v,image_url:d.data.publicUrl}));}catch(e){setError(e.message||'배너 업로드에 실패했어요.');}finally{setUploading(false);}
 }
 async function save(e){
  e.preventDefault();if(mutating.current||uploading)return;mutating.current=true;setBusy(true);setError('');
  try{const method=editing==='new'?'POST':'PATCH';const r=await fetch('/api/admin/banners',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,...(method==='PATCH'?{id:editing}:{})})});const d=await r.json();if(!r.ok)throw Error(d.error||'배너 저장 실패');await reload();setEditing(null);setNotice('배너를 저장했어요.');}catch(e){setError(e.message);}finally{mutating.current=false;setBusy(false);}
 }
 async function remove(id){
  if(mutating.current||!window.confirm('배너를 삭제할까요?'))return;mutating.current=true;setBusy(true);setError('');
  try{const r=await fetch('/api/admin/banners',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});const d=await r.json();if(!r.ok)throw Error(d.error);await reload();setNotice('배너를 삭제했어요.');}catch(e){setError(e.message);}finally{mutating.current=false;setBusy(false);}
 }
 function move(index,delta){const next=index+delta;if(next<0||next>=banners.length||busy)return;const copy=[...banners];[copy[index],copy[next]]=[copy[next],copy[index]];setBanners(copy);setDirty(true);setNotice('');}
 async function saveOrder(){
  if(mutating.current||!dirty)return;mutating.current=true;setBusy(true);setError('');
  try{const r=await fetch('/api/admin/banners/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:banners.map(b=>b.id),enabledIds:banners.filter(b=>b.enabled).map(b=>b.id)})});const d=await r.json();if(!r.ok)throw Error(d.error);await reload();setNotice('순서·노출을 저장했어요.');}catch(e){setError(e.message);}finally{mutating.current=false;setBusy(false);}
 }
 return <main className="site-shell v3-site v3-admin-banner-page"><SiteHeader/><section className="v3-admin-banner-wrap"><Link className="v10-admin-back" href="/admin">‹ 관리 메뉴</Link><header><h1>{editing?'배너 등록·수정':'상단 배너 관리'}</h1><p>{editing?'이미지와 연결 대상을 확인해 주세요.':'가족을 찾아요 목록의 배너를 관리해요.'}</p></header>
 {error&&<p role="alert" className="v3-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {editing?<form onSubmit={save} className="v3-admin-banner-editor">
  <Artwork banner={draft}/><input ref={uploadInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>upload(e.target.files?.[0])}/><button type="button" disabled={busy||uploading} onClick={()=>uploadInput.current?.click()}>{uploading?'이미지 업로드 중…':'배너 이미지 교체'}</button>
  <small>표시 비율 390:196 · JPG / PNG / WebP · 최대 3MB. 미리보기에서 잘리는 부분을 확인해요.</small>
  <label>관리용 이름 *<input required maxLength={60} value={draft.title} onChange={e=>setDraft(v=>({...v,title:e.target.value}))}/></label>
  <label>이미지 설명 *<input required maxLength={200} value={draft.image_alt} onChange={e=>setDraft(v=>({...v,image_alt:e.target.value}))}/></label><small>이미지를 볼 수 없을 때와 화면 읽기 도구에 사용해요.</small>
  <label>누르면 이동할 곳<select value={draft.target_type} onChange={e=>setDraft(v=>({...v,target_type:e.target.value}))}>{Object.entries(targets).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
  <label>외부 주소 · 외부 링크 선택 시<input type="url" required={draft.target_type==='external'} disabled={draft.target_type!=='external'} placeholder="https:// 로 시작하는 주소" value={draft.target_url||''} onChange={e=>setDraft(v=>({...v,target_url:e.target.value}))}/></label>
  <label>노출 상태<select value={draft.enabled?'on':'off'} onChange={e=>setDraft(v=>({...v,enabled:e.target.value==='on'}))}><option value="on">켜짐</option><option value="off">꺼짐</option></select></label>
  <button type="button" disabled={!draft.image_url} onClick={()=>setPreview(draft)}>모바일 미리보기</button><div className="v3-admin-banner-actions"><button type="button" disabled={busy||uploading} onClick={()=>setEditing(null)}>취소</button><button type="submit" disabled={busy||uploading||!draft.image_url}>{busy?'저장 중…':'배너 저장'}</button></div>
 </form>:<>
  <div className="v3-admin-banner-summary"><strong>등록 {banners.length} / 3개</strong><button disabled={banners.length>=3||busy} onClick={()=>edit(null)}>+ 배너 등록</button></div>
  {banners.map((b,i)=><article className="v3-admin-banner-record" key={b.id}><Artwork banner={b}/><h2>{b.title}</h2><dl><div><dt>노출 상태</dt><dd>{b.enabled?'켜짐':'꺼짐'}</dd></div><div><dt>연결 대상</dt><dd>{targets[b.target_type]}</dd></div><div><dt>노출 순서</dt><dd>{i+1}번째</dd></div></dl><div className="v3-admin-banner-actions"><button disabled={busy} onClick={()=>edit(b)}>수정</button><button onClick={()=>setPreview(b)}>모바일 미리보기</button><button disabled={busy||i===0} onClick={()=>move(i,-1)}>위로 이동</button><button disabled={busy||i===banners.length-1} onClick={()=>move(i,1)}>아래로 이동</button><button disabled={busy} onClick={()=>{setBanners(list=>list.map(item=>item.id===b.id?{...item,enabled:!item.enabled}:item));setDirty(true);setNotice('');}}>{b.enabled?'노출 끄기':'노출 켜기'}</button><button disabled={busy} onClick={()=>remove(b.id)}>배너 삭제</button></div></article>)}
  {!banners.length&&<p>등록된 배너가 없어요.</p>}<button className="v10-banner-save" disabled={busy||!dirty} onClick={saveOrder}>{busy?'저장 중…':'순서·노출 저장'}</button>
  <p className="v10-banner-note">숨긴 배너도 등록 수에 포함돼요. 최대 3개이며, 더 등록하려면 기존 배너를 교체하거나 삭제해 주세요.</p><p className="v10-banner-note">2개 이상이면 5초마다 전환하고, 터치 중에는 멈춰요. 노출 중인 배너가 없으면 배너 영역을 접어요.</p>
 </>}
 </section>{preview&&<div className="v10-banner-preview-scrim" onClick={()=>setPreview(null)}><section role="dialog" aria-modal="true" aria-label="배너 모바일 미리보기" onClick={e=>e.stopPropagation()}><button ref={previewClose} onClick={()=>setPreview(null)} aria-label="미리보기 닫기">닫기 ×</button><Artwork banner={preview}/><p>{preview.image_alt||preview.title}</p><p>{targets[preview.target_type]}{preview.target_type==='external'?' · '+bannerHref(preview):''}</p></section></div>}</main>;
}
export default function Page(){return <AdminGuard><BannerEditor/></AdminGuard>}
