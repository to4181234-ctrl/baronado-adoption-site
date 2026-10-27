import { loadGoPicks } from '../../../../lib/server/goCards.js';
import { goMember } from '../../../../lib/server/goAuth.js';
import { koreaMonth } from '../../../../lib/goShared.js';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try { return Response.json({ month: koreaMonth(), cards: await loadGoPicks(koreaMonth(), await goMember(request)) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: '이 달의 pick을 불러오지 못했어요.' }, { status: 500 }); }
}
