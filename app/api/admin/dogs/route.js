import { adminDatabase, dogPayload } from '../../../../lib/server/adminData';
import { authorizeMutation, apiResponse, readJson, badRequest } from '../../../../lib/server/adminHttp';

export const runtime = 'nodejs';

export async function POST(request) {
  const blocked = authorizeMutation(request);
  if (blocked) return blocked;
  try {
    const payload = dogPayload(await readJson(request));
    const { data, error } = await adminDatabase().from('dogs').insert(payload).select().single();
    if (error) throw new Error('게시글을 저장하지 못했습니다.');
    return apiResponse({ data }, 201);
  } catch (error) {
    return badRequest(error);
  }
}
