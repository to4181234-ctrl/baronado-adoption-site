import { adminDatabase } from '../../../../lib/server/adminData.js';
import { goError,nicknameKey } from '../../../../lib/server/goAuth.js';
export const dynamic='force-dynamic';
export async function GET(request){
 try{const {key}=nicknameKey(new URL(request.url).searchParams.get('value'));const {data,error}=await adminDatabase().from('go_members').select('id').eq('nickname_key',key).maybeSingle();if(error)throw error;return Response.json({available:!data},{headers:{'Cache-Control':'no-store'}});}
 catch(error){return goError(/닉네임/.test(error.message||'')?error.message:'중복 확인에 실패했어요.');}
}
