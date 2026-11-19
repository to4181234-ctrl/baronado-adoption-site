'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import AdminGuard from '../../../../components/AdminGuard.js';
import SiteHeader from '../../../../components/SiteHeader.js';
import '../../../go-release-admin.css';
function Editor(){
 const [dogs,setDogs]=useState([]),[working,setWorking]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [adoptionFilter,setAdoptionFilter]=useState('all'),[sort,setSort]=useState('newest');
 const reload=useCallback(async()=>{const r=await fetch('/api/admin/go/pixels',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error||'자료를 불러오지 못했어요.');setDogs(d.dogs||[]);},[]);
 useEffect(()=>{reload().catch(e=>setError(e.message));},[reload]);
 async function upload(dogId,kind,file){if(!file)return;setWorking(dogId+kind);setError('');try{
  const form=new FormData();form.set('dogId',dogId);form.set('kind',kind);form.set('file',file);
  const r=await fetch('/api/admin/go/pixels',{method:'PUT',body:form});const d=await r.json();if(!r.ok)throw Error(d.error);setNotice('픽셀 이미지를 등록했어요. 공개는 다시 확인 후 진행해주세요.');await reload();
 }catch(e){setError(e.message);}finally{setWorking('');}}
 async function publish(dog){setWorking(dog.dogId+'publish');setError('');try{
  const r=await fetch('/api/admin/go/pixels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dogId:dog.dogId,published:!dog.published})});
  const d=await r.json();if(!r.ok)throw Error(d.error);setNotice(d.published?'공개했어요.':'비공개로 변경했어요.');await reload();
 }catch(e){setError(e.message);}finally{setWorking('');}}
 const visibleDogs=dogs.filter(d=>adoptionFilter==='all'||Boolean(d.adopted)===(adoptionFilter==='adopted'))
  .sort((a,b)=>(adoptionFilter==='all'?Number(a.adopted)-Number(b.adopted):0)||
   (sort==='newest'?-1:1)*String(a.createdAt||'').localeCompare(String(b.createdAt||''))||a.name.localeCompare(b.name,'ko'));
 return <main className="go-pixel-admin"><h1>강아지 콘텐츠 공개 관리</h1>
  <p>공식 멍카드 4종 + HIDDEN 1종, 돌보기용 픽셀, 대표 썸네일용 픽셀이 모두 등록되어야 해당 강아지의 멍멍GO 기능을 공개할 수 있어요.</p>
  <p><Link href="/admin/go/official">공식 멍카드 등록하러 가기 ›</Link>　<Link href="/admin/go/visit">방문 인증 관리 ›</Link></p>
  <div className="go-pixel-admin-controls"><div role="group" aria-label="입양 상태 필터">
    {[['all','전체'],['active','입양 전'],['adopted','입양 완료']].map(([value,label])=>
     <button key={value} type="button" aria-pressed={adoptionFilter===value} onClick={()=>setAdoptionFilter(value)}>{label}</button>)}
   </div><label>정렬 <select aria-label="강아지 등록 순서" value={sort} onChange={e=>setSort(e.target.value)}>
    <option value="newest">최신 등록순</option><option value="oldest">오래된 등록순</option>
   </select></label></div>
  {error&&<p role="alert" className="v3-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {visibleDogs.length===0&&<p role="status">해당 상태의 강아지가 없어요.</p>}
  {visibleDogs.map(dog=><section key={dog.dogId} className="go-pixel-admin-dog"><h2>{dog.name} <span className="go-pixel-adoption-tag">{dog.adopted?'입양 완료':'입양 전'}</span></h2><p>공식 멍카드 5종: {dog.officialReady?'등록 완료':'미등록/미공개'} · 현재 {dog.ready?'공개 중':'비공개'}</p>
   <div className="go-pixel-admin-images">{[['care','돌보기 픽셀 일러스트',dog.careUrl],['thumbnail','대표 썸네일 픽셀 일러스트',dog.thumbnailUrl]].map(([kind,label,url])=><label key={kind}>
     <strong>{label}</strong>{url?<img src={url} alt={`${dog.name} ${label}`}/>:<span>파일 미등록</span>}
     <input type="file" accept="image/png,image/webp" disabled={Boolean(working)} onChange={e=>{void upload(dog.dogId,kind,e.target.files?.[0]);e.target.value='';}}/>
    </label>)}</div>
    <button type="button" disabled={Boolean(working)||(!dog.published&&(!dog.officialReady||!dog.careUrl||!dog.thumbnailUrl))} onClick={()=>void publish(dog)}>{dog.published?'이 강아지 멍멍GO 비공개로 전환':'등록 완료 후 멍멍GO에 공개'}</button>
   </section>)}
 </main>;
}
export default function AdminPixelPage(){return <><SiteHeader/><AdminGuard><Editor/></AdminGuard></>;}
