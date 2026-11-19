import {hasAllGoPixelImages} from '../goPixelAssets.js';
/** Only dogs with all five official card assets and six required pixel images may go live. */
export async function releasedDogs(db){
 const [sets,pixels,assets]=await Promise.all([
  db.from('go_official_sets').select('dog_id,current_version').not('current_version','is',null),
  db.from('go_dog_pixel_assets').select('dog_id,care_path,thumbnail_path,front_path,side_path,feed_path,praise_path,play_path,is_published,legacy_existing').eq('is_published',true),
  db.from('go_official_assets').select('version_id,slot,title,display_path')
 ]);
 if(sets.error||pixels.error||assets.error)throw Error('release gate unavailable');
 const ready=new Map();
 const pxMap=new Map((pixels.data||[]).filter(p=>p.is_published&&hasAllGoPixelImages(p)).map(p=>[p.dog_id,p]));
 for(const set of sets.data||[]){
  const px=pxMap.get(set.dog_id);if(!px)continue;
  const slots=new Set((assets.data||[]).filter(a=>a.version_id===set.current_version&&a.slot>=1&&a.slot<=5&&a.display_path&&(a.title?.trim()||px.legacy_existing)).map(a=>a.slot));
  if(slots.size===5)ready.set(set.dog_id,px);
 }
 return ready;
}
export async function dogReleased(db,dogId){return (await releasedDogs(db)).has(dogId);}
