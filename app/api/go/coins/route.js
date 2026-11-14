import { adminDatabase } from '../../../../lib/server/adminData.js';
import { goError, goMember } from '../../../../lib/server/goAuth.js';
import { koreaDay, parseCoinHistoryQuery } from '../../../../lib/goCoins.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

// This route stays unavailable until the isolated DB migration and tests pass.
// Merely pushing the development branch never activates the new economy.
export async function GET(request) {
  if (process.env.MEONGGO_STAGE1_COINS_ENABLED !== '1') {
    return goError('멍코인 기능을 준비 중이에요.', 503);
  }
  const member = await goMember(request);
  if (!member) return goError('로그인이 필요해요.', 401);

  const url = new URL(request.url);
  let options;
  try {
    options = parseCoinHistoryQuery(url.searchParams);
  } catch {
    return goError('멍코인 내역 조회 조건을 확인해주세요.', 400);
  }
  const history = url.searchParams.get('history') === '1';
  const today = koreaDay();
  const db = adminDatabase();

  try {
    const walletQuery = db.from('go_coin_wallets')
      .select('balance').eq('member_id', member.id).maybeSingle();
    const dailyQuery = db.from('go_coin_transactions')
      .select('event_type').eq('member_id', member.id).eq('local_day', today)
      .in('event_type', ['care', 'quest_care', 'quest_visit']);

    const [wallet, daily] = await Promise.all([walletQuery, dailyQuery]);
    if (wallet.error || daily.error) throw new Error('coin read failed');

    const entries = daily.data || [];
    const response = {
      balance: Number(wallet.data?.balance ?? 0),
      today,
      daily: {
        careRewards: entries.filter(row => row.event_type === 'care').length,
        careQuestDone: entries.some(row => row.event_type === 'quest_care'),
        visitQuestDone: entries.some(row => row.event_type === 'quest_visit')
      }
    };

    if (history) {
      const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
      let query = db.from('go_coin_transactions')
        .select('id,amount,event_type,local_day,created_at')
        .eq('member_id', member.id).gte('created_at', since);
      if (options.filter === 'earn') query = query.gt('amount', 0);
      if (options.filter === 'spend') query = query.lt('amount', 0);

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(options.offset, options.offset + options.limit);
      if (error) throw error;
      const records = data || [];
      response.history = {
        records: records.slice(0, options.limit),
        hasMore: records.length > options.limit,
        nextOffset: options.offset + Math.min(records.length, options.limit),
        filter: options.filter
      };
    }
    return Response.json(response, { headers: noStore });
  } catch {
    return goError('멍코인 정보를 불러오지 못했어요.', 500);
  }
}
