'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import AdminGuard from '../../../../components/AdminGuard.js';
import SiteHeader from '../../../../components/SiteHeader.js';
import GoCardFace from '../../../../components/GoCardFace.js';
const OFFICIAL_ADMIN_ENABLED=process.env.NEXT_PUBLIC_MEONGGO_STAGE2_OFFICIAL_ENABLED==='1'&&process.env.NEXT_PUBLIC_MEONGGO_STAGE1_COINS_ENABLED==='1';

const slots=[1,2,3,4,5];
const baseValues=()=>Object.fromEntries(slots.map(n=>[n,{title:'',cropX:0.5,cropY:0.5,zoom:1,file:null}]));
function OfficialEditor(){
 const [dogs,setDogs]=useState([]),[sets,setSets]=useState([]),[dogId,setDogId]=useState('');
 const [editing,setEditing]=useState(baseValues),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(true);
 const [previewImage,setPreviewImage]=useState(null),[activeSlot,setActiveSlot]=useState(1);
 const reload=useCallback(async()=>{
  setLoading(true);
  try{
   const r=await fetch('/api/admin/go/official',{cache:'no-store'});
   const data=await r.json();
   if(!r.ok)throw Error(data.error||'공식 멍카드 관리 정보를 읽지 못했어요.');
   setDogs(data.dogs||[]);setSets(data.sets||[]);
   setDogId(current=>current||data.dogs?.[0]?.id||'');
  }catch(e){setError(e.message);}finally{setLoading(false);}
 },[]);
 useEffect(()=>{reload();},[reload]);
 const dog=dogs.find(d=>d.id===dogId);
 const officialSet=sets.find(s=>s.dogId===dogId);
 const draft=officialSet?.versions.find(v=>v.status==='draft');
 const current=officialSet?.versions.find(v=>v.id===officialSet.currentVersion);
 const shown=draft||current;
 const hasFive=Boolean(draft&&draft.assets?.length===5&&slots.every(i=>draft.assets.some(x=>x.slot===i)));
 const published=Boolean(officialSet?.currentVersion);
 const currentValues=editing[activeSlot]||baseValues()[activeSlot];
 const savedAsset=shown?.assets.find(a=>a.slot===activeSlot);
 useEffect(()=>{
  const vals=baseValues();
  const variant=officialSet?.versions.find(v=>v.status==='draft')||
    officialSet?.versions.find(v=>v.id===officialSet?.currentVersion);
  for(const asset of variant?.assets||[]){
   vals[asset.slot]={title:asset.title||'',cropX:Number(asset.crop_x),cropY:Number(asset.crop_y),
    zoom:Number(asset.zoom),file:null};
  }
  setEditing(vals);setActiveSlot(1);setPreviewImage(null);setError('');setMessage('');
 },[dogId,officialSet?.currentVersion,draft?.id]);
 useEffect(()=>{
  if(!currentValues.file){setPreviewImage(null);return;}
  const url=URL.createObjectURL(currentValues.file);
  setPreviewImage(url);
  return()=>URL.revokeObjectURL(url);
 },[currentValues.file]);
 const update=(field,value)=>setEditing(prev=>({
  ...prev,[activeSlot]:{...prev[activeSlot],[field]:value}
 }));
 const post=async(action,versionId=draft?.id)=>{
  if(!dogId||busy)return;
  const confirmMessages={
   publish:published?'기존 획득자의 공식 멍카드 사진과 제목도 동시에 변경돼요. 획득·능력치·HIDDEN 기록은 유지됩니다. 적용할까요?':
    '사진 4종과 HIDDEN 일러스트를 한꺼번에 공개할까요?',
   pause:'신규 뽑기와 상점 판매를 중지할까요? 기존 보유 카드는 유지돼요.',
   resume:'다시 공개할까요? 입양 완료 강아지는 신규 획득 대상에 포함되지 않아요.',
   deleteSet:'과거 획득·해금 이력이 0건인 경우에만 영구 삭제돼요. 계속할까요?',
   discardDraft:'저장하지 않은 변경 사항을 폐기할까요?'
  };
  if(confirmMessages[action]&&!window.confirm(confirmMessages[action]))return;
  setBusy(true);setError('');setMessage('');
  try{
   const r=await fetch('/api/admin/go/official',{method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({action,dogId,versionId})});
   const data=await r.json();
   if(!r.ok||!data.ok)throw Error(data.error||'작업을 완료하지 못했어요.');
   setMessage(({newDraft:'임시 수정안을 열었어요.',publish:'5종을 한꺼번에 적용했어요.',
     pause:'공개를 중지했어요.',resume:'다시 공개했어요.',
     deleteSet:'세트가 삭제됐어요.',discardDraft:'임시 수정안을 폐기했어요.'})[action]);
   await reload();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const updatePhoto=async()=>{
  if(!dogId||!draft?.id||busy)return;
  const options=editing[activeSlot];
  if(activeSlot<=4&&(!options.title?.trim()||options.title.trim().length>30)){
   setError('사진 제목을 1~30자로 입력해주세요.');return;
  }
  if(!options.file&&!savedAsset){setError('먼저 새 사진 파일을 선택해주세요.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   let r;
   if(options.file){
    const fd=new FormData();
    fd.append('dogId',dogId);fd.append('versionId',draft.id);fd.append('slot',String(activeSlot));
    fd.append('title',options.title||'');fd.append('cropX',String(options.cropX));
    fd.append('cropY',String(options.cropY));fd.append('zoom',String(options.zoom));
    fd.append('file',options.file);
    r=await fetch('/api/admin/go/official',{method:'PUT',body:fd});
   }else{
    r=await fetch('/api/admin/go/official',{method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({dogId,versionId:draft.id,slot:activeSlot,
       title:options.title,cropX:options.cropX,cropY:options.cropY,zoom:options.zoom})
    });
   }
   const data=await r.json();
   if(!r.ok||!data.ok)throw Error(data.error||'저장하지 못했어요.');
   setMessage(activeSlot===5?'HIDDEN 일러스트를 임시 저장했어요.':
     '사진 '+activeSlot+'번의 제목과 구도를 임시 저장했어요.');
   setEditing(v=>({...v,[activeSlot]:{...v[activeSlot],file:null}}));
   await reload();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const uploadedCount=draft?.assets.length??0;
 return <main className="site-shell v3-site v10-admin-cards"><SiteHeader/>
   <section className="v10-admin-content go-official-admin">
    <Link className="v10-admin-back" href="/admin">‹ 관리 메뉴</Link>
    <header className="v10-admin-heading"><h1>공식 멍카드 관리</h1>
      <p>사용자 제작 카드 관리와 별도로, 강아지별 공식 사진 4종 + HIDDEN 일러스트를 등록해요.</p></header>
    {error&&<p className="v3-error" role="alert">{error}</p>}
    {message&&<p role="status" className="go-official-success">{message}</p>}
    {!OFFICIAL_ADMIN_ENABLED?<p>2차 기능 비활성 상태예요.</p>:
    loading?<p role="status">공식 카드 정보를 불러오는 중이에요.</p>:<>
      <label className="go-official-admin-dog-label">강아지 선택
        <select value={dogId} onChange={e=>setDogId(e.target.value)}>
          {dogs.map(d=><option key={d.id} value={d.id}>
            {d.name}{d.adopted?' (입양 완료)':''}
          </option>)}
        </select>
      </label>
      {dog&&<section className="go-official-admin-status">
        <p><strong>{dog.name}</strong> · {dog.adopted?'입양 완료':'입양 전'}</p>
        <p>상태: {!published?'공개 전':officialSet.paused?'공개 중지':'공개 중'}</p>
        <p>{draft?'임시 수정안 '+uploadedCount+'/5종 등록':'작성 중인 수정안 없음'}</p>
        {!draft&&<button type="button" disabled={busy} onClick={()=>post('newDraft')}>
          {published?'공개본에서 새 수정안 만들기':'공식 멍카드 등록 시작'}</button>}
      </section>}
      {(draft||current)&&<section className="go-official-admin-editor">
        <h2>{draft?'공식 멍카드 수정안':'현재 공개 버전'}</h2>
        <p className="v10-admin-note">슬롯을 선택해 사진과 카드 제목을 등록하세요. 원본은 별도 보존하고 Figma의 사진 영역(134×132)에 맞춰 구도를 조절해요.</p>
        <div className="go-official-admin-slots">{slots.map(slot=>
          <button type="button" key={slot} className={activeSlot===slot?'is-selected':''}
            onClick={()=>setActiveSlot(slot)}>
            {shown?.assets.find(x=>x.slot===slot)?.imageUrl?
              <img src={shown.assets.find(x=>x.slot===slot).imageUrl} alt={'슬롯 '+slot+' 미리보기'}/>:
              <span>+</span>}
            <small>{slot===5?'HIDDEN':slot+'번'}</small>
          </button>)}</div>
        <div className="go-official-admin-edit-area">
          <h3>{activeSlot===5?'HIDDEN 특별 일러스트':'공식 사진 '+activeSlot+'번'}</h3>
          <div className="go-official-admin-photo-preview" aria-label="이미지 구도 미리보기">
            {previewImage||savedAsset?.imageUrl?
              <img src={previewImage||savedAsset.imageUrl} alt="사진 구도 미리보기"
               style={previewImage?{objectPosition:(currentValues.cropX*100)+'% '+(currentValues.cropY*100)+'%',
                transform:'scale('+currentValues.zoom+')'}:undefined}/>:
              <span>사진을 등록해주세요</span>}
          </div>
          {activeSlot<=4&&savedAsset?.imageUrl&&<div className="go-official-admin-card-face">
            <GoCardFace card={{dogName:dog?.name||'강아지',nickname:'바로나도',
              imageUrl:savedAsset.imageUrl,capturedAt:null,battle:{power:0,charm:0}}}/>
            <small>Figma 카드 프레임 미리보기 · 파워/매력은 사용자가 획득할 때 결정돼요.</small>
          </div>}
          {draft&&<>
            <label>새 이미지 파일
              <input type="file" accept="image/jpeg,image/png,image/webp"
                onChange={e=>update('file',e.target.files?.[0]||null)}/>
            </label>
            {activeSlot<=4&&<label>카드별 제목 (최대 30자)
              <input maxLength={30} value={currentValues.title}
                onChange={e=>update('title',e.target.value)} placeholder="예: 햇살 아래의 구름"/>
            </label>}
            {activeSlot<=4&&<div className="go-official-admin-crop">
              {[['cropX','사진 가로 위치'],['cropY','사진 세로 위치'],['zoom','확대 비율']].map(([key,label])=>
                <label key={key}>{label} <b>{Number(currentValues[key]).toFixed(2)}</b>
                  <input type="range" min={key==='zoom'?1:0} max={key==='zoom'?3:1}
                    step={0.05} value={currentValues[key]}
                    onChange={e=>update(key,Number(e.target.value))}/>
                </label>)}
            </div>}
            <button type="button" disabled={busy} onClick={updatePhoto}>
              {busy?'저장 중…':'이 슬롯 임시 저장'}
            </button>
          </>}
        </div>
      </section>}
      {draft&&<div className="go-official-admin-actions">
        <button disabled={busy||!hasFive} onClick={()=>post('publish',draft.id)}>
          {published?'변경 사항 일괄 적용':'5종 일괄 공개하기'}
        </button>
        <button disabled={busy} onClick={()=>post('discardDraft',draft.id)}>수정안 폐기</button>
      </div>}
      {published&&<div className="go-official-admin-actions">
        <button disabled={busy} onClick={()=>post(officialSet.paused?'resume':'pause')}>
          {officialSet.paused?'재공개':'공개 중지'}
        </button>
        <button className="is-danger" disabled={busy} onClick={()=>post('deleteSet')}>
          공식 세트 삭제 (획득 이력 0건만)
        </button>
      </div>}
      {!published&&draft&&<button className="go-official-admin-delete" disabled={busy}
        onClick={()=>post('deleteSet')}>임시 세트 전체 삭제</button>}
      <p className="v10-admin-note">사진 교체 시 이미 획득한 사용자에게도 새 이미지가 적용되지만, 카드 소유·파워·매력·HIDDEN 해금 기록은 유지해요. 입양 완료된 강아지는 재공개 후에도 신규 획득 대상이 아니에요.</p>
    </>}
   </section></main>;
}
export default function Page(){return <AdminGuard><OfficialEditor/></AdminGuard>;}
