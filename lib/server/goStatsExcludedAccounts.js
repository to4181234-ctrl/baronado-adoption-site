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
