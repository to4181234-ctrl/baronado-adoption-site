import { adminDatabase,validId } from '../../../../../../lib/server/adminData.js';
import { goError,goMember } from '../../../../../../lib/server/goAuth.js';
export const dynamic='force-dynamic';
export async function GET(request,{params}){
 const {id}=await params;if(!validId(id))return goError('카드를 확인해주세요.',404);
 const member=await goMember(request);const db=adminDatabase();
 const {data:card,error}=await db.from('go_cards').select('member_id,status,image_path').eq('id',id).maybeSingle();
 if(error)return goError('사진을 불러오지 못했어요.',500);
 if(!card||(card.status!=='approved'&&card.member_id!==member?.id))return goError('사진을 찾지 못했어요.',404);
 const file=await db.storage.from('go-cards').download(card.image_path);
 if(file.error)return goError('사진을 불러오지 못했어요.',500);
 return new Response(new Uint8Array(await file.data.arrayBuffer()),{headers:{'Content-Type':file.data.type||'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
