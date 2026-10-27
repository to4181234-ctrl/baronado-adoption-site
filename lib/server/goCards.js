import { adminDatabase } from './adminData.js';

export async function loadGoCards({ member = null, mine = false, dogId = null, order = 'newest', page = 0, moderation = null } = {}) {
  const db = adminDatabase();
  const offset = Math.min(1000, Math.max(0, Number(page) || 0)) * 24;
  let query = db.from('go_cards').select('id,dog_id,member_id,image_path,photo_style,description,captured_at,status,created_at')
    .order('created_at', { ascending: order === 'oldest' }).order('id', { ascending: order === 'oldest' })
    .range(offset, offset + 24);
  if (moderation) query = query.eq('status', moderation);
  else if (mine && member) query = query.eq('member_id', member.id);
  else query = query.eq('status', 'approved');
  if (dogId) query = query.eq('dog_id', dogId);
  const { data: rows, error } = await query;
  if (error) throw error;
  const hasMore = rows.length > 24;
  const cards = rows.slice(0, 24);
  if (!cards.length) return { cards: [], hasMore };
  const dogIds = [...new Set(cards.map(card => card.dog_id))];
  const memberIds = [...new Set(cards.map(card => card.member_id))];
  const cardIds = cards.map(card => card.id);
  const [dogs, people, likes, reports, signed] = await Promise.all([
    db.from('dogs').select('id,name,adopted,images').in('id', dogIds),
    db.from('go_members').select('id,nickname').in('id', memberIds),
    db.from('go_likes').select('card_id,member_id').in('card_id', cardIds),
    db.from('go_reports').select('card_id').in('card_id', cardIds),
    db.storage.from('go-cards').createSignedUrls(cards.map(card => card.image_path), 3600)
  ]);
  if (dogs.error || people.error || likes.error || reports.error || signed.error) throw new Error('카드를 불러오지 못했어요.');
  const dogMap = new Map(dogs.data.map(dog => [dog.id, dog]));
  const nameMap = new Map(people.data.map(person => [person.id, person.nickname]));
  return { hasMore, cards: cards.map((card, index) => ({
    id: card.id, dogId: card.dog_id, dogName: dogMap.get(card.dog_id)?.name || '친구',
    adopted: Boolean(dogMap.get(card.dog_id)?.adopted),
    nickname: nameMap.get(card.member_id) || '기록자',
    ownerId: card.member_id, imageUrl: signed.data[index]?.signedUrl || '',
    photoStyle: card.photo_style, description: card.description, capturedAt: card.captured_at,
    status: card.status,
    reportCount: reports.data.filter(report => report.card_id === card.id).length,
    likeCount: likes.data.filter(like => like.card_id === card.id).length,
    liked: Boolean(member && likes.data.some(like => like.card_id === card.id && like.member_id === member.id))
  })) };
}
