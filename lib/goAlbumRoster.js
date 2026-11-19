/** Shared pure rules for collecting, hiding and expanding adoption dog thumbnails. */
export const ALBUM_PREVIEW_LIMIT=6;
export function albumRoster(dogs=[],catalog=[],cameraCounts={},member=false){
 const indexed=new Map(catalog.map(d=>[d.dogId,d]));
 return dogs.map((dog,index)=>{
  const item=indexed.get(dog.id);
  const owned=Boolean(member&&((Number(cameraCounts?.[dog.id])||0)>0||(item?.collected||0)>0||item?.hidden?.unlocked));
  return {...dog,owned,published:Boolean(item?.publishedComplete),index};
 }).filter(d=>d.adopted?d.owned:(d.published||d.owned))
  .sort((a,b)=>Number(a.adopted)-Number(b.adopted)||
    (!a.adopted?Number(b.owned)-Number(a.owned):0)||a.index-b.index);
}
export function albumPreview(roster=[],expanded=false){
 return expanded?roster:roster.filter(d=>!d.adopted).slice(0,ALBUM_PREVIEW_LIMIT);
}
export function albumProgress(roster=[]){
 const active=roster.filter(d=>!d.adopted);
 return {collected:active.filter(d=>d.owned).length,total:active.length};
}
