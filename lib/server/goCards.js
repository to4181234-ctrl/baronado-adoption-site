import { adminDatabase } from './adminData.js';
import { koreaMonth, monthDate } from '../goShared.js';

export async function loadGoCards({ member = null, mine = false, dogId = null, order = 'newest', page = 0, moderation = null, query = '', ids = null, id = null } = {}) {
  const db = adminDatabase();
  const offset = Math.max(0, Number(page) || 0) * 24;
  let request = db.from('go_card_index').select('*', { count: 'exact' })
    .order('created_at', { ascending: order === 'oldest' }).order('id', { ascending: order === 'oldest' }).range(offset, offset + 23);
  if (moderation) request = request.eq('status', moderation);
  else if (mine && member) request = request.eq('member_id', member.id);
  else request = request.eq('status', 'approved');
  if (dogId) request = request.eq('dog_id', dogId);
  if (id) request = request.eq('id', id);
  if (ids) { if (!ids.length) return { cards: [], total: 0, hasMore: false }; request = request.in('id', ids); }
  if (query.trim()) request = request.ilike('search_text', '%' + query.trim().replace(/[\\%_]/g, '\\$&') + '%');
  const { data: rows, count, error } = await request;
  if (error) throw error;
  if (!rows.length) return { cards: [], total: count || 0, hasMore: false };
  const [likes, signed] = await Promise.all([
    member ? db.from('go_likes').select('card_id').in('card_id', rows.map(row => row.id)).eq('member_id', member.id) : { data: [] },
    db.storage.from('go-cards').createSignedUrls(rows.map(row => row.image_path), 3600)
  ]);
  if (likes.error || signed.error) throw new Error('카드를 불러오지 못했어요.');
  return { total: count || 0, hasMore: offset + rows.length < count, cards: rows.map((row, index) => ({
    id: row.id, title: row.title, dogId: row.dog_id, dogName: row.dog_name || '멍멍이', adopted: row.dog_adopted,
    nickname: row.nickname, ownerId: row.member_id, imageUrl: signed.data[index]?.signedUrl || '',
    description: row.description, capturedAt: row.captured_at, createdAt: row.created_at,
    status: row.status, likeCount: Number(row.like_count), reportCount: moderation ? Number(row.report_count) : undefined,
    liked: likes.data.some(like => like.card_id === row.id),
    rejectionReason: moderation || row.member_id === member?.id ? row.rejection_reason : undefined,
    rejectionNote: moderation || row.member_id === member?.id ? row.rejection_note : undefined
  })) };
}

export async function loadGoCard(id, member) {
  const { data } = await adminDatabase().from('go_cards').select('member_id,status').eq('id', id).maybeSingle();
  if (!data || (data.status !== 'approved' && data.member_id !== member?.id)) return null;
  const result = await loadGoCards({ member, mine: data.member_id === member?.id, id });
  return result.cards[0] || null;
}

export async function loadGoPicks(month = koreaMonth(), member = null) {
  const { data, error } = await adminDatabase().from('go_picks').select('slot,card_id').eq('month', monthDate(month)).order('slot');
  if (error) throw error;
  const { cards } = await loadGoCards({ member, ids: data.map(item => item.card_id) });
  return data.map(item => { const card = cards.find(card => card.id === item.card_id); return card ? { ...card, slot: item.slot } : null; }).filter(Boolean);
}
