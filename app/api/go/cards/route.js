import sharp from 'sharp';
import { randomInt } from 'node:crypto';
import {drawGoCardRatings} from '../../../../lib/goCardDraw.js';
import { adminDatabase, validId } from '../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed } from '../../../../lib/server/goAuth.js';
import { loadGoCards } from '../../../../lib/server/goCards.js';
import { parseBulkCardIds } from '../../../../lib/goBulkDelete.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const member = await goMember(request);
    const dogId = url.searchParams.get('dog');
    if (dogId && !validId(dogId)) return goError('멍멍이를 확인해주세요.');
    const mine = url.searchParams.get('mine') === '1';
    if (mine && !member) return goError('로그인이 필요해요.', 401);
    const page = Number(url.searchParams.get('page') || 0);
    if (!Number.isInteger(page) || page < 0 || page > 1000) return goError('페이지를 확인해주세요.');
    const limit = Number(url.searchParams.get('limit') || 24);
    if (!Number.isInteger(limit) || limit < 1 || limit > 24) return goError('불러올 카드 수를 확인해주세요.');
    const data = await loadGoCards({ member, mine, dogId, page, limit, query: (url.searchParams.get('q') || '').slice(0, 80), order: url.searchParams.get('order') === 'oldest' ? 'oldest' : 'newest' });
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return goError('카드를 불러오지 못했어요.', 500); }
}

export async function DELETE(request) {
  const blocked = goMutationAllowed(request);
  if (blocked) return blocked;
  const member = await goMember(request);
  if (!member) return goError('로그인이 필요해요.', 401);

  let ids;
  try {
    ids = parseBulkCardIds((await request.json()).ids);
  } catch (error) {
    return goError(error.message || '선택한 카드를 확인해주세요.');
  }

  try {
    const db = adminDatabase();
    const { data: owned, error: lookupError } = await db.from('go_cards')
      .select('id').in('id', ids).eq('member_id', member.id);
    if (lookupError) throw lookupError;
    if (owned.length !== ids.length) return goError('본인이 작성한 카드만 삭제할 수 있어요. 목록을 다시 확인해주세요.', 403);

    // Keep the owner predicate on the actual deletion as well as the preflight check.
    const { data: deleted, error } = await db.from('go_cards').delete()
      .in('id', ids).eq('member_id', member.id).select('id,image_path');
    if (error) throw error;
    const imagePaths = (deleted || []).map(card => card.image_path).filter(Boolean);
    const cleanup = imagePaths.length ? await db.storage.from('go-cards').remove(imagePaths) : { error: null };
    return Response.json({
      ok: true, deletedIds: (deleted || []).map(card => card.id),
      cleanupPending: Boolean(cleanup.error),
      partial: (deleted || []).length !== ids.length
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return goError('선택한 카드를 삭제하지 못했어요.', 500);
  }
}

export async function POST(request) {
  const blocked = goMutationAllowed(request);
  if (blocked) return blocked;
  const member = await goMember(request);
  if (!member) return goError('로그인이 필요해요.', 401);
  let savedPath;
  try {
    const db = adminDatabase();
    const form = await request.formData();
    const dogId = form.get('dogId');
    const title = form.get('title');
    const file = form.get('photo');
    const suppliedId = form.get('requestId');
    if (suppliedId !== null && !validId(suppliedId)) return goError('저장 요청을 확인해주세요.');
    const cardId = suppliedId || crypto.randomUUID();
    if (!validId(dogId) || typeof title !== 'string' || !title.trim() || title.trim().length > 30 || !file || typeof file.arrayBuffer !== 'function') return goError('제목, 사진과 기록을 확인해주세요.');
    if (!['image/webp', 'image/png'].includes(file.type) || file.size < 1000 || file.size > 3 * 1024 * 1024) return goError('촬영 사진은 3MB 이하로 저장해주세요.');
    const replay = async () => {
      const { data, error } = await db.from('go_cards').select('id,member_id,dog_id,status,captured_at').eq('id',cardId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      if (data.member_id !== member.id || data.dog_id !== dogId) return goError('다른 저장 요청과 겹쳤어요. 다시 촬영해주세요.',409);
      return Response.json({id:data.id,status:data.status,capturedAt:data.captured_at},{status:200});
    };
    const existing = await replay();
    if (existing) return existing;
    const { data: dog } = await db.from('dogs').select('id,category,adopted').eq('id', dogId).maybeSingle();
    if (!dog || dog.category !== 'adoption' || dog.adopted) return goError('현재 기록할 수 없는 멍멍이예요.', 409);
    const raw = Buffer.from(await file.arrayBuffer());
    const image = sharp(raw, { limitInputPixels: 4_000_000 });
    const meta = await image.metadata();
    if (meta.width < 300 || meta.height < 300 || meta.width > 2500 || meta.height > 2500 || !['webp', 'png'].includes(meta.format)) return goError('사진 크기나 형식을 확인해주세요.');
    const output = await image.webp({ quality: 82 }).toBuffer();
    if (output.length > 3 * 1024 * 1024) return goError('사진 용량을 줄여 다시 시도해주세요.');
    const uploadPath = `${member.id}/${cardId}.webp`;
    const upload = await db.storage.from('go-cards').upload(uploadPath, output, { contentType: 'image/webp', upsert: false });
    if (upload.error) {
      const completed = await replay();
      if (completed) return completed;
      if (['409','Duplicate'].includes(String(upload.error.statusCode)) || upload.error.error === 'Duplicate') return goError('카드를 저장하고 있어요. 잠시 후 같은 사진으로 다시 시도해주세요.',409);
      throw upload.error;
    }
    savedPath = uploadPath;
    // One go_cards row is also the public post via go_card_index; status approved publishes immediately.
    savedPath = null;
    const { data, error } = await db.from('go_cards').insert({ id:cardId, dog_id: dogId, member_id: member.id, image_path: uploadPath, photo_style: 'original', status:'approved', title: title.trim(), description: title.trim(), ...drawGoCardRatings(randomInt) }).select('id,captured_at').single();
    if (error) {
      // A lost insert response must not delete an image belonging to a committed card.
      const completed = await replay();
      if (completed) { savedPath = null; return completed; }
      savedPath = uploadPath;
      throw error;
    }
    return Response.json({ id: data.id, status: 'approved', capturedAt: data.captured_at }, { status: 201 });
  } catch {
    if (savedPath) await adminDatabase().storage.from('go-cards').remove([savedPath]);
    return goError('카드 저장에 실패했어요. 잠시 후 다시 시도해주세요.', 500);
  }
}
