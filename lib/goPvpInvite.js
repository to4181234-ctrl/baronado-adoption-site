const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function normalizedPvpInvite(raw){
 if(typeof raw!=='string'||raw.length>300)return null;
 let value=raw.trim();
 if(/^https?:\/\//i.test(value)){
  try{
   const target=new URL(value);
   if(target.pathname.replace(/\/$/,'')!=='/go/battle')return null;
   value=target.searchParams.get('room')||'';
  }catch{return null;}
 }
 return UUID.test(value)||/^[a-f0-9]{12}$/i.test(value)?value:null;
}
