import sharp from 'sharp';
import { adminDatabase, validId } from '../../../../lib/server/adminData.js';
import { goError, goMember, goMutationAllowed } from '../../../../lib/server/goAuth.js';
import { loadGoCards } from '../../../../lib/server/goCards.js';
import { validateRatings } from '../../../../lib/goRatings.js';

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
    const description = form.get('description');
    const file = form.get('photo');
    let ratings;
    try { ratings = validateRatings(JSON.parse(form.get('ratings') || '{}')); }
    catch { return goError('별점은 1~5개 중에서 선택해주세요.'); }
    if (!validId(dogId) || typeof title !== 'string' || !title.trim() || title.trim().length > 80 || typeof description !== 'string' || !description.trim() || description.trim().length > 200 || !file || typeof file.arrayBuffer !== 'function') return goError('제목, 사진과 기록을 확인해주세요.');
    if (!['image/webp', 'image/png'].includes(file.type) || file.size < 1000 || file.size > 3 * 1024 * 1024) return goError('촬영 사진은 3MB 이하로 저장해주세요.');
    const { data: dog } = await db.from('dogs').select('id,category,adopted').eq('id', dogId).maybeSingle();
    if (!dog || dog.category !== 'adoption' || dog.adopted) return goError('현재 기록할 수 없는 멍멍이예요.', 409);
    const raw = Buffer.from(await file.arrayBuffer());
    const image = sharp(raw, { limitInputPixels: 4_000_000 });
    const meta = await image.metadata();
    if (meta.width < 300 || meta.height < 300 || meta.width > 2500 || meta.height > 2500 || !['webp', 'png'].includes(meta.format)) return goError('사진 크기나 형식을 확인해주세요.');
    const output = await image.webp({ quality: 82 }).toBuffer();
    if (output.length > 3 * 1024 * 1024) return goError('사진 용량을 줄여 다시 시도해주세요.');
    savedPath = `${member.id}/${crypto.randomUUID()}.webp`;
    const upload = await db.storage.from('go-cards').upload(savedPath, output, { contentType: 'image/webp', upsert: false });
    if (upload.error) throw upload.error;
    const { data, error } = await db.from('go_cards').insert({ dog_id: dogId, member_id: member.id, image_path: savedPath, photo_style: 'original', title: title.trim(), description: description.trim(), ...ratings }).select('id,captured_at').single();
    if (error) throw error;
    return Response.json({ id: data.id, status: 'pending', capturedAt: data.captured_at }, { status: 201 });
  } catch {
    if (savedPath) await adminDatabase().storage.from('go-cards').remove([savedPath]);
    return goError('카드 저장에 실패했어요. 잠시 후 다시 시도해주세요.', 500);
  }
}
