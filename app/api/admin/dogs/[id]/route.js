import { adminDatabase, dogPayload, validId } from '../../../../../lib/server/adminData';
import { authorizeMutation, apiResponse, readJson, badRequest } from '../../../../../lib/server/adminHttp';

export const runtime = 'nodejs';

async function authorized(request, context) {
  const blocked = authorizeMutation(request);
  if (blocked) return { blocked };
  const { id } = await context.params;
  if (!validId(id)) return { blocked: apiResponse({ error: '게시글 주소가 올바르지 않습니다.' }, 400) };
  return { id };
}

export async function PATCH(request, context) {
  const { blocked, id } = await authorized(request, context);
  if (blocked) return blocked;
  try {
    const payload = dogPayload(await readJson(request));
    const { data, error } = await adminDatabase().from('dogs')
      .update(payload).eq('id', id).select().maybeSingle();
    if (error) throw new Error('게시글을 수정하지 못했습니다.');
    if (!data) return apiResponse({ error: '게시글을 찾을 수 없습니다.' }, 404);
    return apiResponse({ data });
  } catch (error) {
    return badRequest(error);
  }
}

export async function DELETE(request, context) {
  const { blocked, id } = await authorized(request, context);
  if (blocked) return blocked;
  try {
    const { data, error } = await adminDatabase().from('dogs')
      .delete().eq('id', id).select('id').maybeSingle();
    if (error) throw new Error('게시글을 삭제하지 못했습니다.');
    if (!data) return apiResponse({ error: '게시글을 찾을 수 없습니다.' }, 404);
    return apiResponse({ data });
  } catch (error) {
    return badRequest(error);
  }
}
