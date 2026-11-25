/**
 * Server-only reporting exclusion list.
 *
 * These three *accounts* (초코눈나, 나루, 바로나도) are excluded from
 * MeongGO admin statistics for all dates, including future activity.
 * Use immutable member IDs, not nicknames, so nickname edits do not
 * reintroduce their activity into reports.
 *
 * Does NOT disable or delete any account or affect ordinary game play,
 * inventory, transactions or public album rankings.
 */
export const TEST_ACCOUNT_IDS=Object.freeze([
 '74f9342c-6dda-4e0f-8ac3-fb4118409e45', // 초코눈나
 '56225b6f-b5fb-44ff-bb34-7afd5286f1c7', // 나루
 'c8ddd6f2-18e9-4dd3-89fb-b627491a6646'  // 바로나도
]);

const excluded=new Set(TEST_ACCOUNT_IDS);

/** For report-only Supabase/PostgREST queries, before paging. */
export function excludeTestAccounts(query,memberColumn='member_id'){
 return query.not(memberColumn,'in',`(${TEST_ACCOUNT_IDS.join(',')})`);
}

/** For row filtering when two accounts take part in the same event. */
export function isTestAccount(id){return excluded.has(id);}
export function isRealMatch(record){
 return !isTestAccount(record.member_id)&&!isTestAccount(record.opponent_id);
}


/**
 * Every account with a manual admin_grant transaction is excluded from ALL
 * MeongGO administrator statistics, regardless of the grant date or amount.
 * This automatically covers future coin top-ups explicitly requested through
 * the operator, as long as each top-up records event_type='admin_grant'.
 *
 * Keep the three older test accounts excluded even if their transaction
 * history is later archived. The result is evaluated on every stats request,
 * so a member is excluded immediately after the first manual grant.
 *
 * Reporting only: no changes to wallets, card ownership, or public rankings.
 */
export async function getExcludedStatsAccountIds(db){
 const ids=new Set(TEST_ACCOUNT_IDS);
 const batchSize=1000;
 for(let offset=0;offset<50000;offset+=batchSize){
  const {data,error}=await db.from('go_coin_transactions')
   .select('member_id')
   .eq('event_type','admin_grant')
   .range(offset,offset+batchSize-1);
  if(error)throw error; // fail closed: never publish inflated stats
  for(const row of data||[])if(row.member_id)ids.add(row.member_id);
  if((data||[]).length<batchSize)return [...ids];
 }
 throw Error('수동 멍코인 지급 계정이 통계 조회 한도를 초과했어요.');
}

export function excludeStatsAccounts(query,memberColumn='member_id',excludedIds=TEST_ACCOUNT_IDS){
 if(!excludedIds.length)return query;
 return query.not(memberColumn,'in',`(${excludedIds.join(',')})`);
}
