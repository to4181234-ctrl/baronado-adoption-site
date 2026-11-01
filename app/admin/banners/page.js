'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard.js';
import SiteHeader from '../../../components/SiteHeader.js';
import {fetchDogs} from '../../../lib/dogs.js';
import {getAgeInfo} from '../../../lib/dogProfile.js';
const EMPTY={name:'',alt:'',image_url:'',link_type:'none',external_url:'',visible:true};
const OPTIONS=[['none','연결 없음'],['adoption','가족을 찾아요'],['resident','상주견 소개'],['go','멍멍GO!'],['external','외부 링크']];
async function api(path,options){const response=await fetch(path,{cache:'no-store',credentials:'same-origin',...options});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'관리자 요청에 실패했어요.');return data}
function BannerEditor(){
 const [items,setItems]=useState([]),[mode,setMode]=useState('list'),[editing,setEditing]=useState(EMPTY),[file,setFile]=useState(null),[tempUrl,setTempUrl]=useState('');
 const [previewReturn,setPreviewReturn]=useState('list'),[previewDogs,setPreviewDogs]=useState([]);
 const [target,setTarget]=useState(null),[chosenLink,setChosenLink]=useState('none'),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[error,setError]=useState('');
 const refresh=useCallback(async()=>{setLoading(true);setError('');try{const data=await api('/api/admin/banners');setItems(data.banners||[])}catch(e){setError(e.message)}finally{setLoading(false)}},[]);
 useEffect(()=>{refresh()},[refresh]);
 useEffect(()=>{if(!file){setTempUrl('');return;}const url=URL.createObjectURL(file);setTempUrl(url);return()=>URL.revokeObjectURL(url)},[file]);
 useEffect(()=>{if(mode!=='preview')return;let live=true;fetchDogs('adoption').then(dogs=>{if(live)setPreviewDogs(dogs.slice(0,2))}).catch(()=>{if(live)setPreviewDogs([])});return()=>{live=false}},[mode]);
 const previewSrc=tempUrl||editing.image_url;
 function startEdit(item){setEditing(item?{...item}:EMPTY);setFile(null);setMessage('');setError('');setMode('edit')}
 function move(index,direction){const to=index+direction;if(to<0||to>=items.length)return;setItems(old=>{const copy=[...old];[copy[index],copy[to]]=[copy[to],copy[index]];return copy})}
 async function saveOrder(){setBusy(true);setError('');try{await api('/api/admin/banners',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reorder',ids:items.map(item=>item.id)})});setMessage('순서가 저장됐어요.')}catch(e){setError(e.message);await refresh()}finally{setBusy(false)}}
 async function save(){setBusy(true);setError('');try{
  let imageUrl=editing.image_url;
  if(file){const fd=new FormData();fd.set('image',file);const uploaded=await api('/api/admin/banners/image',{method:'POST',body:fd});imageUrl=uploaded.imageUrl}
  const body={name:editing.name,alt:editing.alt,image_url:imageUrl,link_type:editing.link_type,external_url:editing.external_url,visible:Boolean(editing.visible)};
  await api(editing.id?`/api/admin/banners/${editing.id}`:'/api/admin/banners',{method:editing.id?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  setMode('list');setFile(null);setMessage('배너가 저장됐어요.');await refresh();
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 async function remove(){if(!target)return;setBusy(true);setError('');try{await api('/api/admin/banners/'+target.id,{method:'DELETE'});setMode('list');setTarget(null);setMessage('배너가 삭제됐어요.');await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 const visible=items.filter(item=>item.visible);
 const destination=OPTIONS.find(([key])=>key===editing.link_type)?.[1]||'연결 없음';
 return <main className="site-shell v3-site v3-admin-banner-site"><SiteHeader/><section className="v3-banner-admin">
  <Link className="v3-banner-admin-back" href="/admin">‹ 관리 메뉴</Link>
  <h1>{mode==='list'?'상단 배너 관리':mode==='edit'?'배너 등록·수정':mode==='choose'?'배너 연결 대상':mode==='preview'?'배너 모바일 미리보기':'배너 삭제'}</h1>
  <p className="v3-banner-admin-subtitle">{mode==='list'?'가족을 찾아요 목록의 배너를 관리해요.':mode==='edit'?'이미지와 연결 대상을 확인해 주세요.':mode==='choose'?'이동할 곳을 하나 선택해 주세요.':mode==='preview'?'저장 전에 크기·잘림·순서를 확인해요.':'삭제할 배너를 확인해 주세요.'}</p>
  {error&&<p role="alert" className="v3-error">{error}</p>}{message&&<p role="status" className="v3-status">{message}</p>}
  {mode==='list'&&<>
   <div className="v3-banner-admin-head"><span>등록 {items.length} / 3개</span><button type="button" disabled={items.length>=3||busy} onClick={()=>startEdit(null)}>+ 배너 등록</button></div>
   {loading?<p className="v3-status">배너를 불러오는 중이에요.</p>:items.length===0?<p className="v3-status">등록된 배너가 없어요.</p>:items.map((item,index)=><article className="v3-banner-admin-card" key={item.id}>
    <img src={item.image_url} alt={item.alt}/><strong>{item.name}</strong>
    <dl><dt>노출 상태</dt><dd>{item.visible?'켜짐':'꺼짐'}</dd><dt>연결 대상</dt><dd>{OPTIONS.find(([k])=>k===item.link_type)?.[1]||'연결 없음'}</dd><dt>노출 순서</dt><dd>{index+1}번째</dd></dl>
    <div className="v3-banner-admin-actions"><button onClick={()=>startEdit(item)}>수정</button><button onClick={()=>{setEditing({...item});setFile(null);setPreviewReturn('list');setMode('preview')}}>모바일 미리보기</button><button disabled={index===0} onClick={()=>move(index,-1)}>위로 이동</button><button disabled={index===items.length-1} onClick={()=>move(index,1)}>아래로 이동</button><button onClick={async()=>{setBusy(true);setError('');try{await api('/api/admin/banners/'+item.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,visible:!item.visible})});await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}}>{item.visible?'노출 끄기':'노출 켜기'}</button><button onClick={()=>{setTarget(item);setMode('delete')}}>배너 삭제</button></div>
   </article>)}
   {items.length>0&&<button className="v3-banner-primary" disabled={busy} onClick={saveOrder}>{busy?'저장 중…':'순서·노출 저장'}</button>}
   <p className="v3-banner-note">숨긴 배너도 등록 수에 포함돼요. 최대 3개이며, 더 등록하려면 기존 배너를 교체하거나 삭제해 주세요.</p><p className="v3-banner-note">2개 이상이면 5초마다 전환하고, 터치 중에는 멈춰요. 노출 중인 배너가 없으면 배너 영역을 접어요.</p>
  </>}
  {mode==='edit'&&<form onSubmit={e=>{e.preventDefault();save()}} className="v3-banner-editor">
   <label>배너 이미지 교체 <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(f.size>3*1024*1024){setError('이미지는 최대 3MB까지 등록할 수 있어요.');return}setFile(f)}}/></label>
   {previewSrc&&<img className="v3-banner-preview-image" src={previewSrc} alt={editing.alt||'배너 이미지 미리보기'}/>}<small>표시 비율 390:196 · JPG / PNG / WebP · 최대 3MB. 미리보기에서 잘리는 부분을 확인해요.</small>
   <label>관리용 이름 *<input maxLength={80} required value={editing.name} onChange={e=>setEditing(v=>({...v,name:e.target.value}))}/></label>
   <label>이미지 설명 *<input maxLength={200} required value={editing.alt} onChange={e=>setEditing(v=>({...v,alt:e.target.value}))}/></label><small>이미지를 볼 수 없을 때와 화면 읽기 도구에 사용해요.</small>
   <button className="v3-banner-choice" type="button" onClick={()=>{setChosenLink(editing.link_type);setMode('choose')}}>누르면 이동할 곳　{destination} ›</button>
   {editing.link_type==='external'&&<label>외부 주소 · 외부 링크 선택 시<input type="url" required pattern="https://.*" placeholder="https:// 로 시작하는 주소" value={editing.external_url||''} onChange={e=>setEditing(v=>({...v,external_url:e.target.value}))}/></label>}
   <label>노출 상태 <select value={editing.visible?'on':'off'} onChange={e=>setEditing(v=>({...v,visible:e.target.value==='on'}))}><option value="on">켜짐</option><option value="off">꺼짐</option></select></label>
   <button className="v3-banner-choice" type="button" onClick={()=>{setPreviewReturn('edit');setMode('preview')}}>모바일 미리보기</button>
   <button className="v3-banner-primary" type="submit" disabled={busy||(!previewSrc&&!file)}>{busy?'저장 중…':'배너 저장'}</button><button type="button" onClick={()=>setMode('list')}>취소</button><p className="v3-banner-note">업로드·저장 실패 시 기존 배너는 유지해요.</p>
  </form>}
  {mode==='choose'&&<div className="v3-banner-choices">{OPTIONS.map(([key,label])=><label key={key}><input type="radio" name="banner-link" checked={chosenLink===key} onChange={()=>setChosenLink(key)}/>{label}</label>)}<p>내부 페이지는 주소를 입력하지 않아도 돼요. 외부 링크는 편집 화면에 전체 주소를 입력해 주세요.</p><button type="button" className="v3-banner-primary" onClick={()=>{setEditing(v=>({...v,link_type:chosenLink}));setMode('edit')}}>선택 적용</button><button type="button" onClick={()=>setMode('edit')}>취소</button></div>}
  {mode==='preview'&&<div className="v3-banner-preview"><div className="v3-banner-preview-image-wrap">{previewSrc?<img src={previewSrc} alt={editing.alt||'배너 미리보기'}/>:<p>배너 이미지가 없어요.</p>}</div><h2>가족을 찾아요</h2><p>입양 상태　전체보기 ▾</p><p>등록 순서　최신순 ▾</p><div className="v3-banner-preview-dogs">{previewDogs.map(d=><div className="v3-banner-preview-dog" key={d.id}>{d.images?.[0]&&<img src={d.images[0]} alt={d.name}/>}<strong>{d.name}</strong><small>{d.gender} · 중성화 {d.neutered?'O':'X'} · {getAgeInfo(d).listDisplay}</small></div>)}</div><p className="v3-banner-note">미리보기는 실제 노출과 방문자 기록을 바꾸지 않아요. 점 표시는 여러 배너가 있을 때의 배치예요.</p><button className="v3-banner-primary" type="button" onClick={()=>setMode(previewReturn)}>편집으로 돌아가기</button></div>}
  {mode==='delete'&&<div className="v3-banner-delete"><p><strong>{target?.name}</strong>를 삭제할까요?</p><p>삭제하면 사이트에서 배너가 사라져요. 잠시 내리고 싶다면 삭제 대신 노출을 꺼주세요.</p><button type="button" className="v3-banner-primary" disabled={busy} onClick={remove}>{busy?'삭제 중…':'배너 삭제'}</button><button type="button" onClick={()=>{setMode('list');setTarget(null)}}>취소</button></div>}
 </section></main>
}
export default function BannerAdminPage(){return <AdminGuard><BannerEditor/></AdminGuard>}
