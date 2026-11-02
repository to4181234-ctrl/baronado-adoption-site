// Admin banner rules. Figma: at most three records INCLUDING hidden banners.
export const BANNER_LIMIT=3;
export const BANNER_TARGETS=['none','adoption','resident','go','external'];
export function bannerPayload(value){
 if(!value||typeof value!=='object')throw Error('배너 정보를 확인해주세요.');
 const title=String(value.title||'').trim();
 if(!title||title.length>60)throw Error('배너 이름은 1~60자로 입력해주세요.');
 const image_url=String(value.image_url||'').trim();
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
 // Only project-owned dog-images public assets; no arbitrary remote images.
 if(image_url!=='/figma-v3/hero-logo.svg'&&(!base || !image_url.startsWith(base.replace(/\/$/,'')+'/storage/v1/object/public/dog-images/')))throw Error('바로나도에 업로드한 이미지만 사용할 수 있어요.');
 const image_alt=String(value.image_alt??title).trim();
 if(!image_alt||image_alt.length>200)throw Error('이미지 설명은 1~200자로 입력해주세요.');
 const target_type=String(value.target_type||'none');
 if(!BANNER_TARGETS.includes(target_type))throw Error('배너 연결 대상을 확인해주세요.');
 const target_url=target_type==='external'?String(value.target_url||'').trim():null;
 if(target_type==='external'){
  let parsed;try{parsed=new URL(target_url)}catch{throw Error('외부 링크 주소를 확인해주세요.');}
  if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)throw Error('HTTP(S) 외부 링크만 사용할 수 있어요.');
 }
 return {title,image_url,image_alt,target_type,target_url,enabled:Boolean(value.enabled)};
}
export function bannerHref(b){
 switch(b.target_type){case 'adoption':return '/';case 'resident':return '/residents';case 'go':return '/go';case 'external':return /^https?:\/\//.test(b.target_url||'')?b.target_url:null;default:return null;}
}
