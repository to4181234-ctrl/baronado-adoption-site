import { adminDatabase, imageUrl } from '../../../../lib/server/adminData';
import { authorizeMutation, apiResponse, readJson, badRequest } from '../../../../lib/server/adminHttp';

export const runtime = 'nodejs';

export async function POST(request) {
  const blocked = authorizeMutation(request);
  if (blocked) return blocked;
  try {
    const { url } = await readJson(request, 1600);
    if (!imageUrl(url)) throw new Error('등록된 사진 주소를 확인해주세요.');
    const marker = '/storage/v1/object/public/dog-images/';
    const path = decodeURIComponent(new URL(url).pathname.split(marker)[1]);
    const { data, error } = await adminDatabase().storage.from('dog-images').download(path);
    if (error || !data) throw new Error('기존 사진을 불러오지 못했습니다.');
    if (data.size > 10 * 1024 * 1024) throw new Error('사진 크기가 10MB를 넘습니다. 원본 파일을 다시 업로드해주세요.');
    return new Response(await data.arrayBuffer(), {
      headers: { 'Content-Type': data.type || 'image/jpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    });
  } catch (error) {
    return badRequest(error);
  }
}
