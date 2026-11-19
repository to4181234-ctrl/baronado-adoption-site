/** Resolve pre-existing Figma pixel sprites from this exact source tree,
 * while keeping newly uploaded admin assets on private Supabase Storage.
 * Never sign or expose an arbitrary path from a database row as a public URL. */
const STATIC=/^\/(?:figma-preview\/dog-(?:kangji|buddy|pposil|gureum|oreo)\.png|figma-v3\/(?:kangji|buddy|pposil|gureum|oreo)-(?:side|feed|play|praise)\.png)$/;
export function approvedStaticPixelUrl(path){
 return typeof path==='string'&&STATIC.test(path)?path:null;
}
export async function pixelImageUrls(db,bucket,paths,seconds=1800){
 const nonstatic=[...new Set(paths.filter(p=>p&&!approvedStaticPixelUrl(p)))];
 const map=new Map(paths.filter(Boolean).map(p=>[p,approvedStaticPixelUrl(p)||'']));
 if(nonstatic.length){
  const result=await db.storage.from(bucket).createSignedUrls(nonstatic,seconds);
  if(result.error)throw result.error;
  nonstatic.forEach((path,i)=>map.set(path,result.data?.[i]?.signedUrl||''));
 }
 return map;
}
